# OpenWrt Stats WebUI Setup

`docker-compose.yml`

```yaml
---
version: '2.1'
services:
  openwrtstats:
    image: lov432/openwrt-stats:latest
    container_name: openwrtstats
    volumes:
      - ./db/:/app/db/
    ports:
      - 3000:3000
    environment:
      - PASSWORD= # Password given by router_setup.sh. You can keep it empty if you haven't setup the router yet
      - ROUTER_URL=http://192.168.1.1 # URL of your router
      - MAX_UPLOAD_SPEED=20 # Max upload speed in Mbps
      - MAX_DOWNLOAD_SPEED=20 # Max download speed in Mbps
    restart: unless-stopped
```

# Router Setup Script

## Prerequisites

Before running the script, make sure you have the following dependencies installed on your OpenWrt router:

1. **curl**:
   To install curl:

   ```shell
   opkg update
   opkg install curl
   ```

2. **iptables-zz-legacy**:
   To install iptables-zz-legacy:

   ```shell
   opkg update
   opkg install iptables-zz-legacy
   ```

3. **wrtbwmon**:
   You can install the wrtbwmon package by uploading the .ipk file via OpenWrt's LuCI interface. Navigate to "System > Software," then use the "Upload Package" feature to install it. You can find the package at [https://github.com/pyrovski/wrtbwmon](https://github.com/pyrovski/wrtbwmon).

## Enabling wrtbwmon

Before proceeding, you need to enable the `wrtbwmon` service. Run the following commands to start and enable it:

```shell
/etc/init.d/wrtbwmon start
/etc/init.d/wrtbwmon enable
```

## Setup Script

1. Download the setup script to your router using curl:

```shell
curl -LO https://raw.githubusercontent.com/LoV432/next-openwrt-stats/master/router_setup.sh
```

2. Make the script executable by running the following command:

```shell
chmod +x router_setup.sh
```

## Running the Script

To execute the setup script, you need to provide your WebUI URL. Ensure that there are no trailing slashes in the URL. Replace `https://webui.example.com` with your actual WebUI URL.

```shell
./router_setup.sh https://webui.example.com
```

The script will generate a password, which you'll need to add to your `docker-compose.yml` file.

## Additional Configuration

In some cases, you might need to disable DNS rebind protection. You can do this from the "Network > DHCP and DNS" settings in your OpenWrt router's configuration.
