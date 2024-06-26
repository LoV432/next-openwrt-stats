#!/bin/ash

if [ -z "$1" ]; then
  echo ""
  echo ""
  echo "Please provide the URL of your OpenWrt Stats WebUI and the name of your pppoe interface as parameter"
  echo "You can find the name of your pppoe interface from your OpenWrt WebUI in the 'Network > Interfaces' tab"
  echo "./router_setup.sh <url> <interface>"
  echo "Examples:"
  echo "./router_setup.sh https://example.com wan"
  echo "./router_setup.sh http://192.168.1.30:8080 pppoe-wan"
  echo "./router_setup.sh https://openwrtstats.example.com mickymouse"
  echo "Dont add any trailing slash to the URL"
  echo "It's fine if you don't have WebUI installed yet. Just make sure that when you install the WebUI, The router will be able to reach the WebUI using the URL"
  echo ""
  echo ""
  exit 1
fi

if [ -z "$2" ]; then
  echo ""
  echo ""
  echo "Please provide the URL of your OpenWrt Stats WebUI and the name of your pppoe interface as parameter"
  echo "You can find the name of your pppoe interface from your OpenWrt LuCi WebUI in the 'Network > Interfaces' tab"
  echo "./router_setup.sh <url> <interface>"
  echo "Examples:"
  echo "./router_setup.sh https://example.com wan"
  echo "./router_setup.sh http://192.168.1.30:8080 pppoe-wan"
  echo "./router_setup.sh https://openwrtstats.example.com mickymouse"
  echo "Dont add any trailing slash to the URL"
  echo "It's fine if you don't have WebUI installed yet. Just make sure that when you install the WebUI, The router will be able to reach the WebUI using the URL"
  echo ""
  echo ""
  exit 1
fi

# Function to generate a random password
generate_password() {
  tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 12
}

# Generate a random password
password=$(generate_password)
password_hash=$(uhttpd -m $password)

# Add user to rcpd config
#############################

file="/etc/config/rpcd"
search_string="option username 'readstats'"

if grep -q "$search_string" "$file"; then
  echo "User already exists. Skipping user creation."
else
  config_data="config login
          option username 'readstats'
          option password '$password_hash'
          list read 'readstats'
          list write 'readstats'
  "
  echo "" >> "/etc/config/rpcd"
  echo "$config_data" >> "/etc/config/rpcd"
  echo "Added user 'readstats' to /etc/config/rpcd"
  echo "*****************************"
  echo ""

  echo "Password is $password"
  echo "Please save this in a safe place. You will need it when setting up WebUI."

  echo ""
  echo "*****************************"
fi
echo ""
echo ""
#############################


# Create permissions file
#############################
json_content='{
  "readstats": {
    "read": {
      "ubus": {
        "file": ["exec", "read"]
      }
    },
    "write": {
      "file": {
        "/etc/wrtbwmon-update": ["exec"],
        "/proc/uptime": ["read"],
        "/etc/pppoe-status": ["exec"],
        "/etc/block-device": ["exec"],
        "/etc/neigh-probe": ["exec"]
      }
    }
  }
}'

# Echo the JSON content to the file
echo "$json_content" > /usr/share/rpcd/acl.d/readstats.json

echo "File 'readstats.json' created with correct permissions at /usr/share/rpcd/acl.d/"
#############################



# Create DHCP trigger script
#############################
content='#!/bin/ash

HOSTNAME=${HOSTNAME/OpenWrt/"Unknown"}
data="{\"hostname\": \"$HOSTNAME\", \"ip\": \"$IPADDR\", \"mac\": \"$MACADDR\", \"type\": \"$ACTION\"}"
curl -d "$data" -X POST URL_HERE/api/dhcp-event
'
content="${content/URL_HERE/$1}"

echo "$content" > /etc/hotplug.d/dhcp/99-dhcp-trigger
echo "Script created /etc/hotplug.d/dhcp/99-dhcp-trigger"
#############################



# Create PPPoE trigger script
#############################
content='#!/bin/ash

if [[ "$INTERFACE" == "INTERFACE_HERE" && "$ACTION" == "ifup" ]]; then
	curl -d '"'"'{"status":"connected"}'"'"' -X POST URL_HERE/api/connection-event

elif [[ "$INTERFACE" == "INTERFACE_HERE" && "$ACTION" == "ifdown" ]]; then
	curl -d '"'"'{"status":"disconnected"}'"'"' -X POST URL_HERE/api/connection-event
fi
'
content="${content//URL_HERE/$1}"
content="${content//INTERFACE_HERE/$2}"

echo "$content" > /etc/hotplug.d/iface/99-pppoe-trigger
echo "Script created /etc/hotplug.d/iface/99-pppoe-trigger"
#############################


# Create wrtbwmon update script
#############################
content='#!/bin/ash
/usr/sbin/wrtbwmon update /tmp/usage.db
/usr/sbin/wrtbwmon dump /tmp/usage.db
'
echo "$content" > /etc/wrtbwmon-update
chmod 755 /etc/wrtbwmon-update
echo "Script created /etc/wrtbwmon-update"
#############################


# Create connected device script
#############################
content=$(cat <<'END_SCRIPT'
#!/bin/sh

ip -4 neigh show nud reachable nud stale nud permanent nud delay
END_SCRIPT
)
echo "$content" > /etc/neigh-probe
chmod 755 /etc/neigh-probe
echo "Script created /etc/neigh-probe"
#############################


# Create user block script
#############################
content=$(cat <<'END_SCRIPT'
#!/bin/sh

# Check if device MAC address is provided as argument
if [ -z "$1" ]; then
    echo "Usage: $0 <device_MAC_address>"
    echo "To delete a rule: $0 -d <device_MAC_address>"
    echo "To retrieve all rules: $0 -r"
    exit 1
fi

# Check if user wants to delete a rule
if [ "$1" = "-d" ]; then
    if [ -z "$2" ]; then
        echo "Please provide the MAC address to delete."
        exit 1
    fi
    DEVICE_MAC="$2"
    # Delete the rule
    uci delete firewall.@rule[$(uci show firewall | grep -E "firewall.@rule\[[0-9]+\].name='Block_Device_$DEVICE_MAC'" | sed -n 's/.*\[//;s/\].*//p')]
    uci commit firewall
    /etc/init.d/firewall restart
    echo "MAC address $DEVICE_MAC deleted."
    exit 0
fi

# Check if user wants to retrieve all the blocks
if [ "$1" = "-r" ]; then
        # Retrieve rule numbers for rules matching pattern Block_Device_*
        RULE_NUMBERS=$(uci show firewall | grep -E "firewall.@rule\[[0-9]+\].name='Block_Device_*" | sed -n 's/.*\[//;s/\].*//p')

        # Check if there are any rules matching the pattern
        if [ -z "$RULE_NUMBERS" ]; then
                echo ""
                #echo "No rules matching pattern Block_Device_ found."
                exit 0
        fi

        # Retrieve source MAC addresses for the matching rules
        for RULE_NUMBER in $RULE_NUMBERS; do
          SOURCE_MAC=$(uci get firewall.@rule["$RULE_NUMBER"].src_mac)
          echo "$SOURCE_MAC"
        done

        exit 0
fi


# Set the device MAC address
DEVICE_MAC="$1"

RULE_NUMBER=$(uci show firewall | grep -E "firewall.@rule\[[0-9]+\].name='Block_Device_$DEVICE_MAC" | sed -n 's/.*\[//;s/\].*//p')

# Check if there are any rules matching the pattern
if [ -n "$RULE_NUMBER" ]; then
        #echo "Matching pattern Block_Device_ found."
        exit 0
fi

# Define the rule name including the MAC address
RULE_NAME="Block_Device_${DEVICE_MAC}"

# Block the device by adding a firewall rule
uci add firewall rule
uci set firewall.@rule[-1].name="$RULE_NAME"
uci set firewall.@rule[-1].src='lan'
uci set firewall.@rule[-1].proto='all'
uci set firewall.@rule[-1].src_mac="$DEVICE_MAC"
uci set firewall.@rule[-1].dest='wan'
uci set firewall.@rule[-1].target='REJECT'

# Commit the changes
uci commit firewall

# Restart firewall to apply changes
/etc/init.d/firewall restart

echo "Device with MAC address $DEVICE_MAC is now blocked from accessing the internet."
#echo "Rule name: $RULE_NAME"
END_SCRIPT
)

echo "$content" > /etc/block-device
chmod 755 /etc/block-device
echo "Script created /etc/block-device"
#############################



# Create ppppoe status script
#############################
content='#!/bin/ash
ubus call network.interface.INTERFACE_HERE status
'
content="${content//INTERFACE_HERE/$2}"

echo "$content" > /etc/pppoe-status
chmod 755 /etc/pppoe-status
echo "Script created /etc/pppoe-status"
#############################


# Create cron task to refresh wrtbwmon
#############################
crontab_file="/etc/crontabs/root"
cron_entry="# Reset wrtbwmon everyday\n0 0 * * * rm /tmp/usage.db && /etc/wrtbwmon-update"
cron_check="# Reset wrtbwmon everyday"

# Check if the crontab file exists
if [ -e "$crontab_file" ]; then
    # Check if the cron entry exists in the crontab file
    if ! grep -qF "$cron_check" "$crontab_file"; then
        # If not, add the cron entry
        echo -e "\n$cron_entry" >> "$crontab_file"
        echo "Cron entry added to $crontab_file"
        service cron restart
    else
        echo "Cron entry already exists in $crontab_file"
    fi
else
    # If the crontab file doesn't exist, create it and add the cron entry
    echo -e "$cron_entry" > "$crontab_file"
    echo "Crontab file created at $crontab_file with the cron entry"
    service cron restart
fi
#############################