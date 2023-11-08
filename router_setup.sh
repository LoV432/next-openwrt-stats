#!/bin/ash

if [ -z "$1" ]; then
    echo "Please provide the URL of where you will host the WebUI as parameter"
    echo "Examples:"
    echo "./router_setup.sh https://example.com"
    echo "./router_setup.sh http://192.168.1.30:8080"
    echo "./router_setup.sh https://openwrtstats.example.com"
    echo "Dont add any trailing slash"
    echo "It's fine if you don't have WebUI installed yet. Just make sure that when you install the WebUI, The router will be able to reach the WebUI using the URL"
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
        "/proc/uptime": ["read"]
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

if [[ "$INTERFACE" == "pppoe" && "$ACTION" == "ifup" ]]; then
	curl -d '{"status":"connected"}' -X POST URL_HERE/api/connection-event

elif [[ "$INTERFACE" == "pppoe" && "$ACTION" == "ifdown" ]]; then
	curl -d '{"status":"disconnected"}' -X POST URL_HERE/api/connection-event
fi
'
content="${content//URL_HERE/$1}"

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