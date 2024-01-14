# Overview

This is a simple dashboard for [OpenWrt](https://openwrt.org/) that does the following things:

1. Displays router uptime.
2. Keeps track of all PPPoE disconnects.
3. Displays PPPoE IP and uptime.
4. Monitors all devices that connect to the router.
5. Shows real-time total bandwidth usage.
6. Shows real-time per-user bandwidth usage.

`Note: Most stuff only works with IPv4`


![Openwrt Stats Big Screen](https://github.com/LoV432/next-openwrt-stats/assets/60856741/2f934ed9-58fa-4d80-9eb2-086a2af54855)

![Openwrt Stats Small Screen](https://github.com/LoV432/next-openwrt-stats/assets/60856741/bc9517c0-7d20-4b7e-a557-206c9aa68808)



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

To run the setup script, you need to provide your WebUI URL and the PPPoE interface name. Ensure that there are no trailing slashes in the URL. You can find the PPPoE interface name under "Network > Interfaces" on OpenWrt LuCi

![interface name](https://github.com/LoV432/next-openwrt-stats/assets/60856741/3e5552fa-2bc6-43fd-adc3-d2db53872157)

```shell
./router_setup.sh https://webui.example.com wan
```

The script will generate a password, which you'll need to add to your `docker-compose.yml` file. After adding the password, recreate the container.

### Additional Configuration

In some cases, you might need to disable DNS rebind protection. You can do this from the "Network > DHCP and DNS" settings in your OpenWrt router's web interface.
