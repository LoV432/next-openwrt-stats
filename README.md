# Next.js OpenWrt Stats

A web dashboard for monitoring and managing all your OpenWrt routers from a single place.

## Features

### 🌐 Network Monitoring
- **Real-time Traffic Monitoring**: Live upload/download speeds with interactive charts
- **Network Interface Information**: Detailed status of all network interfaces
- **Router Information**: System stats including uptime, load average, and memory usage
- **DHCP Client Management**: View all connected devices with IP/MAC addresses and lease times

### 📡 WiFi Management
- **Access Point Control**: View and manage all WiFi APs across all your OpenWrt routers
- **WiFi Client Monitoring**: Real-time traffic stats for connected wireless clients
- **Signal Strength Monitoring**: View signal quality, noise levels, and connection details
- **AP Configuration**: Enable/disable WiFi access points and edit settings
- **Client Presence Tracking**: Monitor WiFi client connection/disconnection history with detailed event logs including:
  - **Event Detection**: Automatically detects when clients connect, disconnect, or move between APs/routers
  - **Historical Timeline**: View detailed connection history for each client (last 20 events)
  - **Change Tracking**: Monitors when clients switch between WiFi networks, routers, or frequency bands

### 🔒 VPN & Security
- **WireGuard Management**: Full WireGuard VPN interface and peer management

### 🛣️ Advanced Routing
- **Policy Based Routing (PBR)**: Manage OpenWrt's PBR package through the web interface


## Quick Start (Docker Compose)

1. **Create Docker Compose configuration**
   ```yaml
   # docker-compose.yaml
   services:
     openwrtstats:
       image: lov432/openwrt-stats:v2
       container_name: openwrtstats
       volumes:
         - ./drizzle/db/:/app/drizzle/db/
       environment:
         - MAX_TRAFFIC=100 # Maximum traffic threshold for charts (in Mbps)
         - PBR_ENABLED=false # Enable Policy Based Routing features (requires OpenWrt pbr package)
         - PRESENCE_ENABLED=false # Enable WiFi client presence tracking and history
       ports:
         - 3000:3000
       restart: unless-stopped
   ```

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Access the dashboard**
   Open your browser and navigate to `http://localhost:3000`

5. **Register your router**
   - On first launch, you'll be redirected to the registration page
   - Enter your OpenWrt router's IP address, username, and password

## Configuration

### OpenWrt RPC Configuration

**Required Setup Step**: On each OpenWrt router you want to monitor, create the following ACL file:

```bash
# Create the ACL file
vi /usr/share/rpcd/acl.d/openwrt-stats.json
```

Add this content to the file:

```json
{
        "openwrt-stats": {
                "description": "Grant UCI access to OpenwrtStats",
                "write": {
                        "ubus": {
                                "uci": [
                                        "set", "commit", "revert"
                                ],
                                "hostapd.*": ["get_clients"]
                        }
                }
        }
}
```

After creating the file, restart the rpcd service:

```bash
/etc/init.d/rpcd restart
```