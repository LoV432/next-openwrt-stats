# Overview

This is a simple dashboard for [OpenWrt](https://openwrt.org/) that does the following things:

1. Displays router uptime.
2. Keeps track of all PPPoE disconnects.
3. Monitors all devices that connect to the router*.
4. Shows real-time total bandwidth usage.
5. Shows real-time per-user bandwidth usage.

`*Note: Device tracking uses DHCP, so devices using static IP addresses will not show up.`


![Openwrt Stats Rounded](https://github.com/LoV432/next-openwrt-stats/assets/60856741/a0413b49-6ca9-4eaf-a128-7c836df9cd52)

![Openwrt Stats Phone Rounded](https://github.com/LoV432/next-openwrt-stats/assets/60856741/a16f40d3-09c6-4426-9875-eb181eed9239)



# Installation

The installation process have two main parts:

1. Install the WebUI.
2. Configure your OpenWrt router.

## WebUI Setup

Setting up the WebUI is pretty simple if you are familiar with [Docker](https://docs.docker.com/get-docker/) and [docker-compose](https://docs.docker.com/compose/). Just create a `docker-compose.yml` file as shown below, configure the environment variables, and run the container.

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
      - PASSWORD= # Password provided by router_setup.sh. Leave it empty if you haven't set up the router yet.
      - ROUTER_URL=http://192.168.1.1 # URL of your router
      - MAX_UPLOAD_SPEED=20 # Maximum upload speed in Mbps
      - MAX_DOWNLOAD_SPEED=20 # Maximum download speed in Mbps
    restart: unless-stopped
```

After running this container, the WebUI will be accessible at `http://localhost:3000`.

## OpenWrt Setup

### Warning

**Before proceeding, you should probably very definitely take a backup of your router.**

### Prerequisites

Before running the script, make sure you have the following dependencies installed on your OpenWrt router:

1. **curl**:
   You can install curl with the following commands:

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
   You can install the wrtbwmon package by uploading the .ipk file via OpenWrt's LuCI interface. Navigate to "System > Software" and use the "Upload Package" feature to install it. You can find the package at [https://github.com/pyrovski/wrtbwmon](https://github.com/pyrovski/wrtbwmon).

### Enabling wrtbwmon

Before proceeding, you need to enable the `wrtbwmon` service. Run the following commands to start and enable it:

```shell
/etc/init.d/wrtbwmon start
/etc/init.d/wrtbwmon enable
```

### Setup Script

1. Download the setup script to your router using curl:

```shell
curl -LO https://raw.githubusercontent.com/LoV432/next-openwrt-stats/master/router_setup.sh
```

2. Make the script executable by running the following command:

```shell
chmod +x router_setup.sh
```

### Running the Script

To run the setup script, you need to provide your WebUI URL. Ensure that there are no trailing slashes in the URL. Replace `https://webui.example.com` with your actual WebUI URL.

```shell
./router_setup.sh https://webui.example.com
```

The script will generate a password, which you'll need to add to your `docker-compose.yml` file. After adding the password, recreate the container.

### Additional Configuration

In some cases, you might need to disable DNS rebind protection. You can do this from the "Network > DHCP and DNS" settings in your OpenWrt router's web interface.
