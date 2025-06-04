#!/bin/bash

# SSL Certificate Generation Script for Prince Vibe E-Commerce
# This script generates SSL certificates for HTTPS deployment

set -e

# Configuration
DOMAIN="princevibe.com"
WILDCARD_DOMAIN="*.princevibe.com"
SSL_DIR="/etc/ssl/princevibe"
PRIVATE_KEY="$SSL_DIR/private.key"
CERTIFICATE="$SSL_DIR/certificate.crt"
CSR_FILE="$SSL_DIR/certificate.csr"
CONFIG_FILE="$SSL_DIR/openssl.cnf"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_message() {
    echo -e "${2}${1}${NC}"
}

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_message "This script should be run as root for production SSL setup" $RED
        print_message "For development, you can run without sudo" $YELLOW
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
        SSL_DIR="./ssl"
        PRIVATE_KEY="$SSL_DIR/private.key"
        CERTIFICATE="$SSL_DIR/certificate.crt"
        CSR_FILE="$SSL_DIR/certificate.csr"
        CONFIG_FILE="$SSL_DIR/openssl.cnf"
    fi
}

# Function to create SSL directory
create_ssl_dir() {
    print_message "Creating SSL directory: $SSL_DIR" $BLUE
    mkdir -p "$SSL_DIR"
    chmod 755 "$SSL_DIR"
}

# Function to generate OpenSSL configuration
generate_openssl_config() {
    print_message "Generating OpenSSL configuration..." $BLUE
    
    cat > "$CONFIG_FILE" << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
req_extensions = req_ext
distinguished_name = dn

[dn]
C=PK
ST=Punjab
L=Lahore
O=Prince Vibe
OU=IT Department
emailAddress=admin@princevibe.com
CN=$DOMAIN

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = $DOMAIN
DNS.2 = www.$DOMAIN
DNS.3 = api.$DOMAIN
DNS.4 = admin.$DOMAIN
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

    print_message "OpenSSL configuration created" $GREEN
}

# Function to generate private key
generate_private_key() {
    print_message "Generating private key..." $BLUE
    
    openssl genrsa -out "$PRIVATE_KEY" 2048
    chmod 600 "$PRIVATE_KEY"
    
    print_message "Private key generated: $PRIVATE_KEY" $GREEN
}

# Function to generate certificate signing request
generate_csr() {
    print_message "Generating Certificate Signing Request (CSR)..." $BLUE
    
    openssl req -new -key "$PRIVATE_KEY" -out "$CSR_FILE" -config "$CONFIG_FILE"
    
    print_message "CSR generated: $CSR_FILE" $GREEN
}

# Function to generate self-signed certificate
generate_self_signed() {
    print_message "Generating self-signed certificate..." $BLUE
    
    openssl req -new -x509 -key "$PRIVATE_KEY" -out "$CERTIFICATE" -days 365 -config "$CONFIG_FILE" -extensions req_ext
    chmod 644 "$CERTIFICATE"
    
    print_message "Self-signed certificate generated: $CERTIFICATE" $GREEN
}

# Function to display certificate information
display_cert_info() {
    print_message "\nCertificate Information:" $BLUE
    openssl x509 -in "$CERTIFICATE" -text -noout | grep -E "(Subject:|DNS:|IP Address:|Not Before:|Not After:)"
}

# Function to create production deployment instructions
create_production_guide() {
    local guide_file="$SSL_DIR/production-ssl-guide.md"
    
    cat > "$guide_file" << 'EOF'
# Production SSL Certificate Setup Guide

## Option 1: Let's Encrypt (Recommended - Free)

### Install Certbot
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot

# CentOS/RHEL
sudo yum install certbot
```

### Generate Certificate
```bash
# For domain validation
sudo certbot certonly --standalone -d princevibe.com -d www.princevibe.com

# For wildcard (requires DNS validation)
sudo certbot certonly --manual --preferred-challenges=dns -d princevibe.com -d *.princevibe.com
```

### Auto-renewal
```bash
# Add to crontab
sudo crontab -e

# Add this line for auto-renewal
0 12 * * * /usr/bin/certbot renew --quiet
```

## Option 2: Commercial SSL Certificate

### 1. Generate CSR (already done by this script)
- Use the CSR file: `/etc/ssl/princevibe/certificate.csr`
- Submit to your SSL provider (Comodo, DigiCert, GoDaddy, etc.)

### 2. Install Certificate
- Replace `/etc/ssl/princevibe/certificate.crt` with provider's certificate
- Install intermediate certificates if provided

## Option 3: Cloudflare SSL (Recommended for ease)

### 1. Add domain to Cloudflare
- Sign up at cloudflare.com
- Add your domain
- Update nameservers

### 2. Enable SSL
- Go to SSL/TLS tab
- Set to "Full (strict)"
- Enable "Always Use HTTPS"

### 3. Origin Certificate
- Generate origin certificate in Cloudflare
- Install on server

## Nginx Configuration (if using reverse proxy)

```nginx
server {
    listen 443 ssl http2;
    server_name princevibe.com www.princevibe.com;
    
    ssl_certificate /etc/ssl/princevibe/certificate.crt;
    ssl_certificate_key /etc/ssl/princevibe/private.key;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name princevibe.com www.princevibe.com;
    return 301 https://$server_name$request_uri;
}
```

## Apache Configuration

```apache
<VirtualHost *:443>
    ServerName princevibe.com
    ServerAlias www.princevibe.com
    
    SSLEngine on
    SSLCertificateFile /etc/ssl/princevibe/certificate.crt
    SSLCertificateKeyFile /etc/ssl/princevibe/private.key
    
    # Modern SSL configuration
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305
    SSLHonorCipherOrder off
    SSLSessionTickets off
    
    # HSTS
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    
    ProxyPass / http://localhost:5000/
    ProxyPassReverse / http://localhost:5000/
    ProxyPreserveHost On
</VirtualHost>
```

## Environment Variables Update

Update your production.env file:
```env
ENABLE_HTTPS=true
SSL_CERT_PATH=/etc/ssl/princevibe/certificate.crt
SSL_KEY_PATH=/etc/ssl/princevibe/private.key
```

## Testing SSL

### 1. SSL Labs Test
https://www.ssllabs.com/ssltest/

### 2. Security Headers
https://securityheaders.com/

### 3. Local Testing
```bash
# Test certificate
openssl x509 -in /etc/ssl/princevibe/certificate.crt -text -noout

# Test SSL connection
openssl s_client -connect princevibe.com:443 -servername princevibe.com
```

## Troubleshooting

### Common Issues
1. **Mixed Content**: Ensure all resources use HTTPS
2. **Certificate Chain**: Include intermediate certificates
3. **Permissions**: Key file should be 600, cert file 644
4. **Firewall**: Open port 443

### Certificate Renewal
- Let's Encrypt: Auto-renews every 90 days
- Commercial: Manual renewal required (usually yearly)

### Monitoring
- Set up monitoring for certificate expiry
- Use tools like SSL Checker or Pingdom
EOF

    print_message "Production SSL guide created: $guide_file" $GREEN
}

# Function to validate certificate
validate_certificate() {
    print_message "Validating certificate..." $BLUE
    
    if openssl x509 -in "$CERTIFICATE" -noout -checkend 86400; then
        print_message "Certificate is valid and not expiring in the next day" $GREEN
    else
        print_message "Certificate validation failed or expiring soon" $RED
    fi
    
    # Check if private key matches certificate
    if [ "$(openssl rsa -in "$PRIVATE_KEY" -pubout 2>/dev/null | openssl md5)" = "$(openssl x509 -in "$CERTIFICATE" -pubkey -noout | openssl md5)" ]; then
        print_message "Private key matches certificate" $GREEN
    else
        print_message "Private key does not match certificate" $RED
    fi
}

# Function to set up development HTTPS
setup_development() {
    print_message "Setting up development HTTPS with self-signed certificate..." $YELLOW
    
    create_ssl_dir
    generate_openssl_config
    generate_private_key
    generate_self_signed
    display_cert_info
    validate_certificate
    
    print_message "\nDevelopment SSL setup complete!" $GREEN
    print_message "To use HTTPS in development:" $BLUE
    print_message "1. Update your .env file:" $YELLOW
    print_message "   ENABLE_HTTPS=true" $YELLOW
    print_message "   SSL_CERT_PATH=$CERTIFICATE" $YELLOW
    print_message "   SSL_KEY_PATH=$PRIVATE_KEY" $YELLOW
    print_message "2. Start your server and visit https://localhost:5000" $YELLOW
    print_message "3. Accept the browser security warning (self-signed certificate)" $YELLOW
}

# Function to set up production
setup_production() {
    print_message "Setting up production SSL..." $YELLOW
    
    create_ssl_dir
    generate_openssl_config
    generate_private_key
    generate_csr
    create_production_guide
    
    print_message "\nProduction SSL setup prepared!" $GREEN
    print_message "Next steps:" $BLUE
    print_message "1. Use the CSR file: $CSR_FILE" $YELLOW
    print_message "2. Follow the production guide: $SSL_DIR/production-ssl-guide.md" $YELLOW
    print_message "3. Install the certificate from your SSL provider" $YELLOW
}

# Main function
main() {
    print_message "Prince Vibe SSL Certificate Generator" $BLUE
    print_message "=====================================" $BLUE
    
    # Check for required tools
    command -v openssl >/dev/null 2>&1 || { 
        print_message "OpenSSL is required but not installed. Aborting." $RED
        exit 1
    }
    
    # Menu
    echo
    print_message "Select an option:" $BLUE
    echo "1) Development HTTPS (self-signed certificate)"
    echo "2) Production HTTPS (generate CSR for commercial certificate)"
    echo "3) Exit"
    echo
    
    read -p "Enter your choice (1-3): " choice
    
    case $choice in
        1)
            check_root
            setup_development
            ;;
        2)
            check_root
            setup_production
            ;;
        3)
            print_message "Exiting..." $YELLOW
            exit 0
            ;;
        *)
            print_message "Invalid option. Exiting..." $RED
            exit 1
            ;;
    esac
}

# Run main function
main "$@" 

# SSL Certificate Generation Script for Prince Vibe E-Commerce
# This script generates SSL certificates for HTTPS deployment

set -e

# Configuration
DOMAIN="princevibe.com"
WILDCARD_DOMAIN="*.princevibe.com"
SSL_DIR="/etc/ssl/princevibe"
PRIVATE_KEY="$SSL_DIR/private.key"
CERTIFICATE="$SSL_DIR/certificate.crt"
CSR_FILE="$SSL_DIR/certificate.csr"
CONFIG_FILE="$SSL_DIR/openssl.cnf"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_message() {
    echo -e "${2}${1}${NC}"
}

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_message "This script should be run as root for production SSL setup" $RED
        print_message "For development, you can run without sudo" $YELLOW
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
        SSL_DIR="./ssl"
        PRIVATE_KEY="$SSL_DIR/private.key"
        CERTIFICATE="$SSL_DIR/certificate.crt"
        CSR_FILE="$SSL_DIR/certificate.csr"
        CONFIG_FILE="$SSL_DIR/openssl.cnf"
    fi
}

# Function to create SSL directory
create_ssl_dir() {
    print_message "Creating SSL directory: $SSL_DIR" $BLUE
    mkdir -p "$SSL_DIR"
    chmod 755 "$SSL_DIR"
}

# Function to generate OpenSSL configuration
generate_openssl_config() {
    print_message "Generating OpenSSL configuration..." $BLUE
    
    cat > "$CONFIG_FILE" << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
req_extensions = req_ext
distinguished_name = dn

[dn]
C=PK
ST=Punjab
L=Lahore
O=Prince Vibe
OU=IT Department
emailAddress=admin@princevibe.com
CN=$DOMAIN

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = $DOMAIN
DNS.2 = www.$DOMAIN
DNS.3 = api.$DOMAIN
DNS.4 = admin.$DOMAIN
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

    print_message "OpenSSL configuration created" $GREEN
}

# Function to generate private key
generate_private_key() {
    print_message "Generating private key..." $BLUE
    
    openssl genrsa -out "$PRIVATE_KEY" 2048
    chmod 600 "$PRIVATE_KEY"
    
    print_message "Private key generated: $PRIVATE_KEY" $GREEN
}

# Function to generate certificate signing request
generate_csr() {
    print_message "Generating Certificate Signing Request (CSR)..." $BLUE
    
    openssl req -new -key "$PRIVATE_KEY" -out "$CSR_FILE" -config "$CONFIG_FILE"
    
    print_message "CSR generated: $CSR_FILE" $GREEN
}

# Function to generate self-signed certificate
generate_self_signed() {
    print_message "Generating self-signed certificate..." $BLUE
    
    openssl req -new -x509 -key "$PRIVATE_KEY" -out "$CERTIFICATE" -days 365 -config "$CONFIG_FILE" -extensions req_ext
    chmod 644 "$CERTIFICATE"
    
    print_message "Self-signed certificate generated: $CERTIFICATE" $GREEN
}

# Function to display certificate information
display_cert_info() {
    print_message "\nCertificate Information:" $BLUE
    openssl x509 -in "$CERTIFICATE" -text -noout | grep -E "(Subject:|DNS:|IP Address:|Not Before:|Not After:)"
}

# Function to create production deployment instructions
create_production_guide() {
    local guide_file="$SSL_DIR/production-ssl-guide.md"
    
    cat > "$guide_file" << 'EOF'
# Production SSL Certificate Setup Guide

## Option 1: Let's Encrypt (Recommended - Free)

### Install Certbot
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot

# CentOS/RHEL
sudo yum install certbot
```

### Generate Certificate
```bash
# For domain validation
sudo certbot certonly --standalone -d princevibe.com -d www.princevibe.com

# For wildcard (requires DNS validation)
sudo certbot certonly --manual --preferred-challenges=dns -d princevibe.com -d *.princevibe.com
```

### Auto-renewal
```bash
# Add to crontab
sudo crontab -e

# Add this line for auto-renewal
0 12 * * * /usr/bin/certbot renew --quiet
```

## Option 2: Commercial SSL Certificate

### 1. Generate CSR (already done by this script)
- Use the CSR file: `/etc/ssl/princevibe/certificate.csr`
- Submit to your SSL provider (Comodo, DigiCert, GoDaddy, etc.)

### 2. Install Certificate
- Replace `/etc/ssl/princevibe/certificate.crt` with provider's certificate
- Install intermediate certificates if provided

## Option 3: Cloudflare SSL (Recommended for ease)

### 1. Add domain to Cloudflare
- Sign up at cloudflare.com
- Add your domain
- Update nameservers

### 2. Enable SSL
- Go to SSL/TLS tab
- Set to "Full (strict)"
- Enable "Always Use HTTPS"

### 3. Origin Certificate
- Generate origin certificate in Cloudflare
- Install on server

## Nginx Configuration (if using reverse proxy)

```nginx
server {
    listen 443 ssl http2;
    server_name princevibe.com www.princevibe.com;
    
    ssl_certificate /etc/ssl/princevibe/certificate.crt;
    ssl_certificate_key /etc/ssl/princevibe/private.key;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name princevibe.com www.princevibe.com;
    return 301 https://$server_name$request_uri;
}
```

## Apache Configuration

```apache
<VirtualHost *:443>
    ServerName princevibe.com
    ServerAlias www.princevibe.com
    
    SSLEngine on
    SSLCertificateFile /etc/ssl/princevibe/certificate.crt
    SSLCertificateKeyFile /etc/ssl/princevibe/private.key
    
    # Modern SSL configuration
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305
    SSLHonorCipherOrder off
    SSLSessionTickets off
    
    # HSTS
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    
    ProxyPass / http://localhost:5000/
    ProxyPassReverse / http://localhost:5000/
    ProxyPreserveHost On
</VirtualHost>
```

## Environment Variables Update

Update your production.env file:
```env
ENABLE_HTTPS=true
SSL_CERT_PATH=/etc/ssl/princevibe/certificate.crt
SSL_KEY_PATH=/etc/ssl/princevibe/private.key
```

## Testing SSL

### 1. SSL Labs Test
https://www.ssllabs.com/ssltest/

### 2. Security Headers
https://securityheaders.com/

### 3. Local Testing
```bash
# Test certificate
openssl x509 -in /etc/ssl/princevibe/certificate.crt -text -noout

# Test SSL connection
openssl s_client -connect princevibe.com:443 -servername princevibe.com
```

## Troubleshooting

### Common Issues
1. **Mixed Content**: Ensure all resources use HTTPS
2. **Certificate Chain**: Include intermediate certificates
3. **Permissions**: Key file should be 600, cert file 644
4. **Firewall**: Open port 443

### Certificate Renewal
- Let's Encrypt: Auto-renews every 90 days
- Commercial: Manual renewal required (usually yearly)

### Monitoring
- Set up monitoring for certificate expiry
- Use tools like SSL Checker or Pingdom
EOF

    print_message "Production SSL guide created: $guide_file" $GREEN
}

# Function to validate certificate
validate_certificate() {
    print_message "Validating certificate..." $BLUE
    
    if openssl x509 -in "$CERTIFICATE" -noout -checkend 86400; then
        print_message "Certificate is valid and not expiring in the next day" $GREEN
    else
        print_message "Certificate validation failed or expiring soon" $RED
    fi
    
    # Check if private key matches certificate
    if [ "$(openssl rsa -in "$PRIVATE_KEY" -pubout 2>/dev/null | openssl md5)" = "$(openssl x509 -in "$CERTIFICATE" -pubkey -noout | openssl md5)" ]; then
        print_message "Private key matches certificate" $GREEN
    else
        print_message "Private key does not match certificate" $RED
    fi
}

# Function to set up development HTTPS
setup_development() {
    print_message "Setting up development HTTPS with self-signed certificate..." $YELLOW
    
    create_ssl_dir
    generate_openssl_config
    generate_private_key
    generate_self_signed
    display_cert_info
    validate_certificate
    
    print_message "\nDevelopment SSL setup complete!" $GREEN
    print_message "To use HTTPS in development:" $BLUE
    print_message "1. Update your .env file:" $YELLOW
    print_message "   ENABLE_HTTPS=true" $YELLOW
    print_message "   SSL_CERT_PATH=$CERTIFICATE" $YELLOW
    print_message "   SSL_KEY_PATH=$PRIVATE_KEY" $YELLOW
    print_message "2. Start your server and visit https://localhost:5000" $YELLOW
    print_message "3. Accept the browser security warning (self-signed certificate)" $YELLOW
}

# Function to set up production
setup_production() {
    print_message "Setting up production SSL..." $YELLOW
    
    create_ssl_dir
    generate_openssl_config
    generate_private_key
    generate_csr
    create_production_guide
    
    print_message "\nProduction SSL setup prepared!" $GREEN
    print_message "Next steps:" $BLUE
    print_message "1. Use the CSR file: $CSR_FILE" $YELLOW
    print_message "2. Follow the production guide: $SSL_DIR/production-ssl-guide.md" $YELLOW
    print_message "3. Install the certificate from your SSL provider" $YELLOW
}

# Main function
main() {
    print_message "Prince Vibe SSL Certificate Generator" $BLUE
    print_message "=====================================" $BLUE
    
    # Check for required tools
    command -v openssl >/dev/null 2>&1 || { 
        print_message "OpenSSL is required but not installed. Aborting." $RED
        exit 1
    }
    
    # Menu
    echo
    print_message "Select an option:" $BLUE
    echo "1) Development HTTPS (self-signed certificate)"
    echo "2) Production HTTPS (generate CSR for commercial certificate)"
    echo "3) Exit"
    echo
    
    read -p "Enter your choice (1-3): " choice
    
    case $choice in
        1)
            check_root
            setup_development
            ;;
        2)
            check_root
            setup_production
            ;;
        3)
            print_message "Exiting..." $YELLOW
            exit 0
            ;;
        *)
            print_message "Invalid option. Exiting..." $RED
            exit 1
            ;;
    esac
}

# Run main function
main "$@" 
 
 
 

# SSL Certificate Generation Script for Prince Vibe E-Commerce
# This script generates SSL certificates for HTTPS deployment

set -e

# Configuration
DOMAIN="princevibe.com"
WILDCARD_DOMAIN="*.princevibe.com"
SSL_DIR="/etc/ssl/princevibe"
PRIVATE_KEY="$SSL_DIR/private.key"
CERTIFICATE="$SSL_DIR/certificate.crt"
CSR_FILE="$SSL_DIR/certificate.csr"
CONFIG_FILE="$SSL_DIR/openssl.cnf"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_message() {
    echo -e "${2}${1}${NC}"
}

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_message "This script should be run as root for production SSL setup" $RED
        print_message "For development, you can run without sudo" $YELLOW
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
        SSL_DIR="./ssl"
        PRIVATE_KEY="$SSL_DIR/private.key"
        CERTIFICATE="$SSL_DIR/certificate.crt"
        CSR_FILE="$SSL_DIR/certificate.csr"
        CONFIG_FILE="$SSL_DIR/openssl.cnf"
    fi
}

# Function to create SSL directory
create_ssl_dir() {
    print_message "Creating SSL directory: $SSL_DIR" $BLUE
    mkdir -p "$SSL_DIR"
    chmod 755 "$SSL_DIR"
}

# Function to generate OpenSSL configuration
generate_openssl_config() {
    print_message "Generating OpenSSL configuration..." $BLUE
    
    cat > "$CONFIG_FILE" << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
req_extensions = req_ext
distinguished_name = dn

[dn]
C=PK
ST=Punjab
L=Lahore
O=Prince Vibe
OU=IT Department
emailAddress=admin@princevibe.com
CN=$DOMAIN

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = $DOMAIN
DNS.2 = www.$DOMAIN
DNS.3 = api.$DOMAIN
DNS.4 = admin.$DOMAIN
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

    print_message "OpenSSL configuration created" $GREEN
}

# Function to generate private key
generate_private_key() {
    print_message "Generating private key..." $BLUE
    
    openssl genrsa -out "$PRIVATE_KEY" 2048
    chmod 600 "$PRIVATE_KEY"
    
    print_message "Private key generated: $PRIVATE_KEY" $GREEN
}

# Function to generate certificate signing request
generate_csr() {
    print_message "Generating Certificate Signing Request (CSR)..." $BLUE
    
    openssl req -new -key "$PRIVATE_KEY" -out "$CSR_FILE" -config "$CONFIG_FILE"
    
    print_message "CSR generated: $CSR_FILE" $GREEN
}

# Function to generate self-signed certificate
generate_self_signed() {
    print_message "Generating self-signed certificate..." $BLUE
    
    openssl req -new -x509 -key "$PRIVATE_KEY" -out "$CERTIFICATE" -days 365 -config "$CONFIG_FILE" -extensions req_ext
    chmod 644 "$CERTIFICATE"
    
    print_message "Self-signed certificate generated: $CERTIFICATE" $GREEN
}

# Function to display certificate information
display_cert_info() {
    print_message "\nCertificate Information:" $BLUE
    openssl x509 -in "$CERTIFICATE" -text -noout | grep -E "(Subject:|DNS:|IP Address:|Not Before:|Not After:)"
}

# Function to create production deployment instructions
create_production_guide() {
    local guide_file="$SSL_DIR/production-ssl-guide.md"
    
    cat > "$guide_file" << 'EOF'
# Production SSL Certificate Setup Guide

## Option 1: Let's Encrypt (Recommended - Free)

### Install Certbot
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot

# CentOS/RHEL
sudo yum install certbot
```

### Generate Certificate
```bash
# For domain validation
sudo certbot certonly --standalone -d princevibe.com -d www.princevibe.com

# For wildcard (requires DNS validation)
sudo certbot certonly --manual --preferred-challenges=dns -d princevibe.com -d *.princevibe.com
```

### Auto-renewal
```bash
# Add to crontab
sudo crontab -e

# Add this line for auto-renewal
0 12 * * * /usr/bin/certbot renew --quiet
```

## Option 2: Commercial SSL Certificate

### 1. Generate CSR (already done by this script)
- Use the CSR file: `/etc/ssl/princevibe/certificate.csr`
- Submit to your SSL provider (Comodo, DigiCert, GoDaddy, etc.)

### 2. Install Certificate
- Replace `/etc/ssl/princevibe/certificate.crt` with provider's certificate
- Install intermediate certificates if provided

## Option 3: Cloudflare SSL (Recommended for ease)

### 1. Add domain to Cloudflare
- Sign up at cloudflare.com
- Add your domain
- Update nameservers

### 2. Enable SSL
- Go to SSL/TLS tab
- Set to "Full (strict)"
- Enable "Always Use HTTPS"

### 3. Origin Certificate
- Generate origin certificate in Cloudflare
- Install on server

## Nginx Configuration (if using reverse proxy)

```nginx
server {
    listen 443 ssl http2;
    server_name princevibe.com www.princevibe.com;
    
    ssl_certificate /etc/ssl/princevibe/certificate.crt;
    ssl_certificate_key /etc/ssl/princevibe/private.key;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name princevibe.com www.princevibe.com;
    return 301 https://$server_name$request_uri;
}
```

## Apache Configuration

```apache
<VirtualHost *:443>
    ServerName princevibe.com
    ServerAlias www.princevibe.com
    
    SSLEngine on
    SSLCertificateFile /etc/ssl/princevibe/certificate.crt
    SSLCertificateKeyFile /etc/ssl/princevibe/private.key
    
    # Modern SSL configuration
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305
    SSLHonorCipherOrder off
    SSLSessionTickets off
    
    # HSTS
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    
    ProxyPass / http://localhost:5000/
    ProxyPassReverse / http://localhost:5000/
    ProxyPreserveHost On
</VirtualHost>
```

## Environment Variables Update

Update your production.env file:
```env
ENABLE_HTTPS=true
SSL_CERT_PATH=/etc/ssl/princevibe/certificate.crt
SSL_KEY_PATH=/etc/ssl/princevibe/private.key
```

## Testing SSL

### 1. SSL Labs Test
https://www.ssllabs.com/ssltest/

### 2. Security Headers
https://securityheaders.com/

### 3. Local Testing
```bash
# Test certificate
openssl x509 -in /etc/ssl/princevibe/certificate.crt -text -noout

# Test SSL connection
openssl s_client -connect princevibe.com:443 -servername princevibe.com
```

## Troubleshooting

### Common Issues
1. **Mixed Content**: Ensure all resources use HTTPS
2. **Certificate Chain**: Include intermediate certificates
3. **Permissions**: Key file should be 600, cert file 644
4. **Firewall**: Open port 443

### Certificate Renewal
- Let's Encrypt: Auto-renews every 90 days
- Commercial: Manual renewal required (usually yearly)

### Monitoring
- Set up monitoring for certificate expiry
- Use tools like SSL Checker or Pingdom
EOF

    print_message "Production SSL guide created: $guide_file" $GREEN
}

# Function to validate certificate
validate_certificate() {
    print_message "Validating certificate..." $BLUE
    
    if openssl x509 -in "$CERTIFICATE" -noout -checkend 86400; then
        print_message "Certificate is valid and not expiring in the next day" $GREEN
    else
        print_message "Certificate validation failed or expiring soon" $RED
    fi
    
    # Check if private key matches certificate
    if [ "$(openssl rsa -in "$PRIVATE_KEY" -pubout 2>/dev/null | openssl md5)" = "$(openssl x509 -in "$CERTIFICATE" -pubkey -noout | openssl md5)" ]; then
        print_message "Private key matches certificate" $GREEN
    else
        print_message "Private key does not match certificate" $RED
    fi
}

# Function to set up development HTTPS
setup_development() {
    print_message "Setting up development HTTPS with self-signed certificate..." $YELLOW
    
    create_ssl_dir
    generate_openssl_config
    generate_private_key
    generate_self_signed
    display_cert_info
    validate_certificate
    
    print_message "\nDevelopment SSL setup complete!" $GREEN
    print_message "To use HTTPS in development:" $BLUE
    print_message "1. Update your .env file:" $YELLOW
    print_message "   ENABLE_HTTPS=true" $YELLOW
    print_message "   SSL_CERT_PATH=$CERTIFICATE" $YELLOW
    print_message "   SSL_KEY_PATH=$PRIVATE_KEY" $YELLOW
    print_message "2. Start your server and visit https://localhost:5000" $YELLOW
    print_message "3. Accept the browser security warning (self-signed certificate)" $YELLOW
}

# Function to set up production
setup_production() {
    print_message "Setting up production SSL..." $YELLOW
    
    create_ssl_dir
    generate_openssl_config
    generate_private_key
    generate_csr
    create_production_guide
    
    print_message "\nProduction SSL setup prepared!" $GREEN
    print_message "Next steps:" $BLUE
    print_message "1. Use the CSR file: $CSR_FILE" $YELLOW
    print_message "2. Follow the production guide: $SSL_DIR/production-ssl-guide.md" $YELLOW
    print_message "3. Install the certificate from your SSL provider" $YELLOW
}

# Main function
main() {
    print_message "Prince Vibe SSL Certificate Generator" $BLUE
    print_message "=====================================" $BLUE
    
    # Check for required tools
    command -v openssl >/dev/null 2>&1 || { 
        print_message "OpenSSL is required but not installed. Aborting." $RED
        exit 1
    }
    
    # Menu
    echo
    print_message "Select an option:" $BLUE
    echo "1) Development HTTPS (self-signed certificate)"
    echo "2) Production HTTPS (generate CSR for commercial certificate)"
    echo "3) Exit"
    echo
    
    read -p "Enter your choice (1-3): " choice
    
    case $choice in
        1)
            check_root
            setup_development
            ;;
        2)
            check_root
            setup_production
            ;;
        3)
            print_message "Exiting..." $YELLOW
            exit 0
            ;;
        *)
            print_message "Invalid option. Exiting..." $RED
            exit 1
            ;;
    esac
}

# Run main function
main "$@" 

# SSL Certificate Generation Script for Prince Vibe E-Commerce
# This script generates SSL certificates for HTTPS deployment

set -e

# Configuration
DOMAIN="princevibe.com"
WILDCARD_DOMAIN="*.princevibe.com"
SSL_DIR="/etc/ssl/princevibe"
PRIVATE_KEY="$SSL_DIR/private.key"
CERTIFICATE="$SSL_DIR/certificate.crt"
CSR_FILE="$SSL_DIR/certificate.csr"
CONFIG_FILE="$SSL_DIR/openssl.cnf"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_message() {
    echo -e "${2}${1}${NC}"
}

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_message "This script should be run as root for production SSL setup" $RED
        print_message "For development, you can run without sudo" $YELLOW
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
        SSL_DIR="./ssl"
        PRIVATE_KEY="$SSL_DIR/private.key"
        CERTIFICATE="$SSL_DIR/certificate.crt"
        CSR_FILE="$SSL_DIR/certificate.csr"
        CONFIG_FILE="$SSL_DIR/openssl.cnf"
    fi
}

# Function to create SSL directory
create_ssl_dir() {
    print_message "Creating SSL directory: $SSL_DIR" $BLUE
    mkdir -p "$SSL_DIR"
    chmod 755 "$SSL_DIR"
}

# Function to generate OpenSSL configuration
generate_openssl_config() {
    print_message "Generating OpenSSL configuration..." $BLUE
    
    cat > "$CONFIG_FILE" << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
req_extensions = req_ext
distinguished_name = dn

[dn]
C=PK
ST=Punjab
L=Lahore
O=Prince Vibe
OU=IT Department
emailAddress=admin@princevibe.com
CN=$DOMAIN

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = $DOMAIN
DNS.2 = www.$DOMAIN
DNS.3 = api.$DOMAIN
DNS.4 = admin.$DOMAIN
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

    print_message "OpenSSL configuration created" $GREEN
}

# Function to generate private key
generate_private_key() {
    print_message "Generating private key..." $BLUE
    
    openssl genrsa -out "$PRIVATE_KEY" 2048
    chmod 600 "$PRIVATE_KEY"
    
    print_message "Private key generated: $PRIVATE_KEY" $GREEN
}

# Function to generate certificate signing request
generate_csr() {
    print_message "Generating Certificate Signing Request (CSR)..." $BLUE
    
    openssl req -new -key "$PRIVATE_KEY" -out "$CSR_FILE" -config "$CONFIG_FILE"
    
    print_message "CSR generated: $CSR_FILE" $GREEN
}

# Function to generate self-signed certificate
generate_self_signed() {
    print_message "Generating self-signed certificate..." $BLUE
    
    openssl req -new -x509 -key "$PRIVATE_KEY" -out "$CERTIFICATE" -days 365 -config "$CONFIG_FILE" -extensions req_ext
    chmod 644 "$CERTIFICATE"
    
    print_message "Self-signed certificate generated: $CERTIFICATE" $GREEN
}

# Function to display certificate information
display_cert_info() {
    print_message "\nCertificate Information:" $BLUE
    openssl x509 -in "$CERTIFICATE" -text -noout | grep -E "(Subject:|DNS:|IP Address:|Not Before:|Not After:)"
}

# Function to create production deployment instructions
create_production_guide() {
    local guide_file="$SSL_DIR/production-ssl-guide.md"
    
    cat > "$guide_file" << 'EOF'
# Production SSL Certificate Setup Guide

## Option 1: Let's Encrypt (Recommended - Free)

### Install Certbot
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot

# CentOS/RHEL
sudo yum install certbot
```

### Generate Certificate
```bash
# For domain validation
sudo certbot certonly --standalone -d princevibe.com -d www.princevibe.com

# For wildcard (requires DNS validation)
sudo certbot certonly --manual --preferred-challenges=dns -d princevibe.com -d *.princevibe.com
```

### Auto-renewal
```bash
# Add to crontab
sudo crontab -e

# Add this line for auto-renewal
0 12 * * * /usr/bin/certbot renew --quiet
```

## Option 2: Commercial SSL Certificate

### 1. Generate CSR (already done by this script)
- Use the CSR file: `/etc/ssl/princevibe/certificate.csr`
- Submit to your SSL provider (Comodo, DigiCert, GoDaddy, etc.)

### 2. Install Certificate
- Replace `/etc/ssl/princevibe/certificate.crt` with provider's certificate
- Install intermediate certificates if provided

## Option 3: Cloudflare SSL (Recommended for ease)

### 1. Add domain to Cloudflare
- Sign up at cloudflare.com
- Add your domain
- Update nameservers

### 2. Enable SSL
- Go to SSL/TLS tab
- Set to "Full (strict)"
- Enable "Always Use HTTPS"

### 3. Origin Certificate
- Generate origin certificate in Cloudflare
- Install on server

## Nginx Configuration (if using reverse proxy)

```nginx
server {
    listen 443 ssl http2;
    server_name princevibe.com www.princevibe.com;
    
    ssl_certificate /etc/ssl/princevibe/certificate.crt;
    ssl_certificate_key /etc/ssl/princevibe/private.key;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name princevibe.com www.princevibe.com;
    return 301 https://$server_name$request_uri;
}
```

## Apache Configuration

```apache
<VirtualHost *:443>
    ServerName princevibe.com
    ServerAlias www.princevibe.com
    
    SSLEngine on
    SSLCertificateFile /etc/ssl/princevibe/certificate.crt
    SSLCertificateKeyFile /etc/ssl/princevibe/private.key
    
    # Modern SSL configuration
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305
    SSLHonorCipherOrder off
    SSLSessionTickets off
    
    # HSTS
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    
    ProxyPass / http://localhost:5000/
    ProxyPassReverse / http://localhost:5000/
    ProxyPreserveHost On
</VirtualHost>
```

## Environment Variables Update

Update your production.env file:
```env
ENABLE_HTTPS=true
SSL_CERT_PATH=/etc/ssl/princevibe/certificate.crt
SSL_KEY_PATH=/etc/ssl/princevibe/private.key
```

## Testing SSL

### 1. SSL Labs Test
https://www.ssllabs.com/ssltest/

### 2. Security Headers
https://securityheaders.com/

### 3. Local Testing
```bash
# Test certificate
openssl x509 -in /etc/ssl/princevibe/certificate.crt -text -noout

# Test SSL connection
openssl s_client -connect princevibe.com:443 -servername princevibe.com
```

## Troubleshooting

### Common Issues
1. **Mixed Content**: Ensure all resources use HTTPS
2. **Certificate Chain**: Include intermediate certificates
3. **Permissions**: Key file should be 600, cert file 644
4. **Firewall**: Open port 443

### Certificate Renewal
- Let's Encrypt: Auto-renews every 90 days
- Commercial: Manual renewal required (usually yearly)

### Monitoring
- Set up monitoring for certificate expiry
- Use tools like SSL Checker or Pingdom
EOF

    print_message "Production SSL guide created: $guide_file" $GREEN
}

# Function to validate certificate
validate_certificate() {
    print_message "Validating certificate..." $BLUE
    
    if openssl x509 -in "$CERTIFICATE" -noout -checkend 86400; then
        print_message "Certificate is valid and not expiring in the next day" $GREEN
    else
        print_message "Certificate validation failed or expiring soon" $RED
    fi
    
    # Check if private key matches certificate
    if [ "$(openssl rsa -in "$PRIVATE_KEY" -pubout 2>/dev/null | openssl md5)" = "$(openssl x509 -in "$CERTIFICATE" -pubkey -noout | openssl md5)" ]; then
        print_message "Private key matches certificate" $GREEN
    else
        print_message "Private key does not match certificate" $RED
    fi
}

# Function to set up development HTTPS
setup_development() {
    print_message "Setting up development HTTPS with self-signed certificate..." $YELLOW
    
    create_ssl_dir
    generate_openssl_config
    generate_private_key
    generate_self_signed
    display_cert_info
    validate_certificate
    
    print_message "\nDevelopment SSL setup complete!" $GREEN
    print_message "To use HTTPS in development:" $BLUE
    print_message "1. Update your .env file:" $YELLOW
    print_message "   ENABLE_HTTPS=true" $YELLOW
    print_message "   SSL_CERT_PATH=$CERTIFICATE" $YELLOW
    print_message "   SSL_KEY_PATH=$PRIVATE_KEY" $YELLOW
    print_message "2. Start your server and visit https://localhost:5000" $YELLOW
    print_message "3. Accept the browser security warning (self-signed certificate)" $YELLOW
}

# Function to set up production
setup_production() {
    print_message "Setting up production SSL..." $YELLOW
    
    create_ssl_dir
    generate_openssl_config
    generate_private_key
    generate_csr
    create_production_guide
    
    print_message "\nProduction SSL setup prepared!" $GREEN
    print_message "Next steps:" $BLUE
    print_message "1. Use the CSR file: $CSR_FILE" $YELLOW
    print_message "2. Follow the production guide: $SSL_DIR/production-ssl-guide.md" $YELLOW
    print_message "3. Install the certificate from your SSL provider" $YELLOW
}

# Main function
main() {
    print_message "Prince Vibe SSL Certificate Generator" $BLUE
    print_message "=====================================" $BLUE
    
    # Check for required tools
    command -v openssl >/dev/null 2>&1 || { 
        print_message "OpenSSL is required but not installed. Aborting." $RED
        exit 1
    }
    
    # Menu
    echo
    print_message "Select an option:" $BLUE
    echo "1) Development HTTPS (self-signed certificate)"
    echo "2) Production HTTPS (generate CSR for commercial certificate)"
    echo "3) Exit"
    echo
    
    read -p "Enter your choice (1-3): " choice
    
    case $choice in
        1)
            check_root
            setup_development
            ;;
        2)
            check_root
            setup_production
            ;;
        3)
            print_message "Exiting..." $YELLOW
            exit 0
            ;;
        *)
            print_message "Invalid option. Exiting..." $RED
            exit 1
            ;;
    esac
}

# Run main function
main "$@" 
 
 
 

# SSL Certificate Generation Script for Prince Vibe E-Commerce
# This script generates SSL certificates for HTTPS deployment

set -e

# Configuration
DOMAIN="princevibe.com"
WILDCARD_DOMAIN="*.princevibe.com"
SSL_DIR="/etc/ssl/princevibe"
PRIVATE_KEY="$SSL_DIR/private.key"
CERTIFICATE="$SSL_DIR/certificate.crt"
CSR_FILE="$SSL_DIR/certificate.csr"
CONFIG_FILE="$SSL_DIR/openssl.cnf"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_message() {
    echo -e "${2}${1}${NC}"
}

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_message "This script should be run as root for production SSL setup" $RED
        print_message "For development, you can run without sudo" $YELLOW
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
        SSL_DIR="./ssl"
        PRIVATE_KEY="$SSL_DIR/private.key"
        CERTIFICATE="$SSL_DIR/certificate.crt"
        CSR_FILE="$SSL_DIR/certificate.csr"
        CONFIG_FILE="$SSL_DIR/openssl.cnf"
    fi
}

# Function to create SSL directory
create_ssl_dir() {
    print_message "Creating SSL directory: $SSL_DIR" $BLUE
    mkdir -p "$SSL_DIR"
    chmod 755 "$SSL_DIR"
}

# Function to generate OpenSSL configuration
generate_openssl_config() {
    print_message "Generating OpenSSL configuration..." $BLUE
    
    cat > "$CONFIG_FILE" << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
req_extensions = req_ext
distinguished_name = dn

[dn]
C=PK
ST=Punjab
L=Lahore
O=Prince Vibe
OU=IT Department
emailAddress=admin@princevibe.com
CN=$DOMAIN

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = $DOMAIN
DNS.2 = www.$DOMAIN
DNS.3 = api.$DOMAIN
DNS.4 = admin.$DOMAIN
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

    print_message "OpenSSL configuration created" $GREEN
}

# Function to generate private key
generate_private_key() {
    print_message "Generating private key..." $BLUE
    
    openssl genrsa -out "$PRIVATE_KEY" 2048
    chmod 600 "$PRIVATE_KEY"
    
    print_message "Private key generated: $PRIVATE_KEY" $GREEN
}

# Function to generate certificate signing request
generate_csr() {
    print_message "Generating Certificate Signing Request (CSR)..." $BLUE
    
    openssl req -new -key "$PRIVATE_KEY" -out "$CSR_FILE" -config "$CONFIG_FILE"
    
    print_message "CSR generated: $CSR_FILE" $GREEN
}

# Function to generate self-signed certificate
generate_self_signed() {
    print_message "Generating self-signed certificate..." $BLUE
    
    openssl req -new -x509 -key "$PRIVATE_KEY" -out "$CERTIFICATE" -days 365 -config "$CONFIG_FILE" -extensions req_ext
    chmod 644 "$CERTIFICATE"
    
    print_message "Self-signed certificate generated: $CERTIFICATE" $GREEN
}

# Function to display certificate information
display_cert_info() {
    print_message "\nCertificate Information:" $BLUE
    openssl x509 -in "$CERTIFICATE" -text -noout | grep -E "(Subject:|DNS:|IP Address:|Not Before:|Not After:)"
}

# Function to create production deployment instructions
create_production_guide() {
    local guide_file="$SSL_DIR/production-ssl-guide.md"
    
    cat > "$guide_file" << 'EOF'
# Production SSL Certificate Setup Guide

## Option 1: Let's Encrypt (Recommended - Free)

### Install Certbot
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot

# CentOS/RHEL
sudo yum install certbot
```

### Generate Certificate
```bash
# For domain validation
sudo certbot certonly --standalone -d princevibe.com -d www.princevibe.com

# For wildcard (requires DNS validation)
sudo certbot certonly --manual --preferred-challenges=dns -d princevibe.com -d *.princevibe.com
```

### Auto-renewal
```bash
# Add to crontab
sudo crontab -e

# Add this line for auto-renewal
0 12 * * * /usr/bin/certbot renew --quiet
```

## Option 2: Commercial SSL Certificate

### 1. Generate CSR (already done by this script)
- Use the CSR file: `/etc/ssl/princevibe/certificate.csr`
- Submit to your SSL provider (Comodo, DigiCert, GoDaddy, etc.)

### 2. Install Certificate
- Replace `/etc/ssl/princevibe/certificate.crt` with provider's certificate
- Install intermediate certificates if provided

## Option 3: Cloudflare SSL (Recommended for ease)

### 1. Add domain to Cloudflare
- Sign up at cloudflare.com
- Add your domain
- Update nameservers

### 2. Enable SSL
- Go to SSL/TLS tab
- Set to "Full (strict)"
- Enable "Always Use HTTPS"

### 3. Origin Certificate
- Generate origin certificate in Cloudflare
- Install on server

## Nginx Configuration (if using reverse proxy)

```nginx
server {
    listen 443 ssl http2;
    server_name princevibe.com www.princevibe.com;
    
    ssl_certificate /etc/ssl/princevibe/certificate.crt;
    ssl_certificate_key /etc/ssl/princevibe/private.key;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name princevibe.com www.princevibe.com;
    return 301 https://$server_name$request_uri;
}
```

## Apache Configuration

```apache
<VirtualHost *:443>
    ServerName princevibe.com
    ServerAlias www.princevibe.com
    
    SSLEngine on
    SSLCertificateFile /etc/ssl/princevibe/certificate.crt
    SSLCertificateKeyFile /etc/ssl/princevibe/private.key
    
    # Modern SSL configuration
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305
    SSLHonorCipherOrder off
    SSLSessionTickets off
    
    # HSTS
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    
    ProxyPass / http://localhost:5000/
    ProxyPassReverse / http://localhost:5000/
    ProxyPreserveHost On
</VirtualHost>
```

## Environment Variables Update

Update your production.env file:
```env
ENABLE_HTTPS=true
SSL_CERT_PATH=/etc/ssl/princevibe/certificate.crt
SSL_KEY_PATH=/etc/ssl/princevibe/private.key
```

## Testing SSL

### 1. SSL Labs Test
https://www.ssllabs.com/ssltest/

### 2. Security Headers
https://securityheaders.com/

### 3. Local Testing
```bash
# Test certificate
openssl x509 -in /etc/ssl/princevibe/certificate.crt -text -noout

# Test SSL connection
openssl s_client -connect princevibe.com:443 -servername princevibe.com
```

## Troubleshooting

### Common Issues
1. **Mixed Content**: Ensure all resources use HTTPS
2. **Certificate Chain**: Include intermediate certificates
3. **Permissions**: Key file should be 600, cert file 644
4. **Firewall**: Open port 443

### Certificate Renewal
- Let's Encrypt: Auto-renews every 90 days
- Commercial: Manual renewal required (usually yearly)

### Monitoring
- Set up monitoring for certificate expiry
- Use tools like SSL Checker or Pingdom
EOF

    print_message "Production SSL guide created: $guide_file" $GREEN
}

# Function to validate certificate
validate_certificate() {
    print_message "Validating certificate..." $BLUE
    
    if openssl x509 -in "$CERTIFICATE" -noout -checkend 86400; then
        print_message "Certificate is valid and not expiring in the next day" $GREEN
    else
        print_message "Certificate validation failed or expiring soon" $RED
    fi
    
    # Check if private key matches certificate
    if [ "$(openssl rsa -in "$PRIVATE_KEY" -pubout 2>/dev/null | openssl md5)" = "$(openssl x509 -in "$CERTIFICATE" -pubkey -noout | openssl md5)" ]; then
        print_message "Private key matches certificate" $GREEN
    else
        print_message "Private key does not match certificate" $RED
    fi
}

# Function to set up development HTTPS
setup_development() {
    print_message "Setting up development HTTPS with self-signed certificate..." $YELLOW
    
    create_ssl_dir
    generate_openssl_config
    generate_private_key
    generate_self_signed
    display_cert_info
    validate_certificate
    
    print_message "\nDevelopment SSL setup complete!" $GREEN
    print_message "To use HTTPS in development:" $BLUE
    print_message "1. Update your .env file:" $YELLOW
    print_message "   ENABLE_HTTPS=true" $YELLOW
    print_message "   SSL_CERT_PATH=$CERTIFICATE" $YELLOW
    print_message "   SSL_KEY_PATH=$PRIVATE_KEY" $YELLOW
    print_message "2. Start your server and visit https://localhost:5000" $YELLOW
    print_message "3. Accept the browser security warning (self-signed certificate)" $YELLOW
}

# Function to set up production
setup_production() {
    print_message "Setting up production SSL..." $YELLOW
    
    create_ssl_dir
    generate_openssl_config
    generate_private_key
    generate_csr
    create_production_guide
    
    print_message "\nProduction SSL setup prepared!" $GREEN
    print_message "Next steps:" $BLUE
    print_message "1. Use the CSR file: $CSR_FILE" $YELLOW
    print_message "2. Follow the production guide: $SSL_DIR/production-ssl-guide.md" $YELLOW
    print_message "3. Install the certificate from your SSL provider" $YELLOW
}

# Main function
main() {
    print_message "Prince Vibe SSL Certificate Generator" $BLUE
    print_message "=====================================" $BLUE
    
    # Check for required tools
    command -v openssl >/dev/null 2>&1 || { 
        print_message "OpenSSL is required but not installed. Aborting." $RED
        exit 1
    }
    
    # Menu
    echo
    print_message "Select an option:" $BLUE
    echo "1) Development HTTPS (self-signed certificate)"
    echo "2) Production HTTPS (generate CSR for commercial certificate)"
    echo "3) Exit"
    echo
    
    read -p "Enter your choice (1-3): " choice
    
    case $choice in
        1)
            check_root
            setup_development
            ;;
        2)
            check_root
            setup_production
            ;;
        3)
            print_message "Exiting..." $YELLOW
            exit 0
            ;;
        *)
            print_message "Invalid option. Exiting..." $RED
            exit 1
            ;;
    esac
}

# Run main function
main "$@" 

# SSL Certificate Generation Script for Prince Vibe E-Commerce
# This script generates SSL certificates for HTTPS deployment

set -e

# Configuration
DOMAIN="princevibe.com"
WILDCARD_DOMAIN="*.princevibe.com"
SSL_DIR="/etc/ssl/princevibe"
PRIVATE_KEY="$SSL_DIR/private.key"
CERTIFICATE="$SSL_DIR/certificate.crt"
CSR_FILE="$SSL_DIR/certificate.csr"
CONFIG_FILE="$SSL_DIR/openssl.cnf"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_message() {
    echo -e "${2}${1}${NC}"
}

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_message "This script should be run as root for production SSL setup" $RED
        print_message "For development, you can run without sudo" $YELLOW
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
        SSL_DIR="./ssl"
        PRIVATE_KEY="$SSL_DIR/private.key"
        CERTIFICATE="$SSL_DIR/certificate.crt"
        CSR_FILE="$SSL_DIR/certificate.csr"
        CONFIG_FILE="$SSL_DIR/openssl.cnf"
    fi
}

# Function to create SSL directory
create_ssl_dir() {
    print_message "Creating SSL directory: $SSL_DIR" $BLUE
    mkdir -p "$SSL_DIR"
    chmod 755 "$SSL_DIR"
}

# Function to generate OpenSSL configuration
generate_openssl_config() {
    print_message "Generating OpenSSL configuration..." $BLUE
    
    cat > "$CONFIG_FILE" << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
req_extensions = req_ext
distinguished_name = dn

[dn]
C=PK
ST=Punjab
L=Lahore
O=Prince Vibe
OU=IT Department
emailAddress=admin@princevibe.com
CN=$DOMAIN

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = $DOMAIN
DNS.2 = www.$DOMAIN
DNS.3 = api.$DOMAIN
DNS.4 = admin.$DOMAIN
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

    print_message "OpenSSL configuration created" $GREEN
}

# Function to generate private key
generate_private_key() {
    print_message "Generating private key..." $BLUE
    
    openssl genrsa -out "$PRIVATE_KEY" 2048
    chmod 600 "$PRIVATE_KEY"
    
    print_message "Private key generated: $PRIVATE_KEY" $GREEN
}

# Function to generate certificate signing request
generate_csr() {
    print_message "Generating Certificate Signing Request (CSR)..." $BLUE
    
    openssl req -new -key "$PRIVATE_KEY" -out "$CSR_FILE" -config "$CONFIG_FILE"
    
    print_message "CSR generated: $CSR_FILE" $GREEN
}

# Function to generate self-signed certificate
generate_self_signed() {
    print_message "Generating self-signed certificate..." $BLUE
    
    openssl req -new -x509 -key "$PRIVATE_KEY" -out "$CERTIFICATE" -days 365 -config "$CONFIG_FILE" -extensions req_ext
    chmod 644 "$CERTIFICATE"
    
    print_message "Self-signed certificate generated: $CERTIFICATE" $GREEN
}

# Function to display certificate information
display_cert_info() {
    print_message "\nCertificate Information:" $BLUE
    openssl x509 -in "$CERTIFICATE" -text -noout | grep -E "(Subject:|DNS:|IP Address:|Not Before:|Not After:)"
}

# Function to create production deployment instructions
create_production_guide() {
    local guide_file="$SSL_DIR/production-ssl-guide.md"
    
    cat > "$guide_file" << 'EOF'
# Production SSL Certificate Setup Guide

## Option 1: Let's Encrypt (Recommended - Free)

### Install Certbot
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot

# CentOS/RHEL
sudo yum install certbot
```

### Generate Certificate
```bash
# For domain validation
sudo certbot certonly --standalone -d princevibe.com -d www.princevibe.com

# For wildcard (requires DNS validation)
sudo certbot certonly --manual --preferred-challenges=dns -d princevibe.com -d *.princevibe.com
```

### Auto-renewal
```bash
# Add to crontab
sudo crontab -e

# Add this line for auto-renewal
0 12 * * * /usr/bin/certbot renew --quiet
```

## Option 2: Commercial SSL Certificate

### 1. Generate CSR (already done by this script)
- Use the CSR file: `/etc/ssl/princevibe/certificate.csr`
- Submit to your SSL provider (Comodo, DigiCert, GoDaddy, etc.)

### 2. Install Certificate
- Replace `/etc/ssl/princevibe/certificate.crt` with provider's certificate
- Install intermediate certificates if provided

## Option 3: Cloudflare SSL (Recommended for ease)

### 1. Add domain to Cloudflare
- Sign up at cloudflare.com
- Add your domain
- Update nameservers

### 2. Enable SSL
- Go to SSL/TLS tab
- Set to "Full (strict)"
- Enable "Always Use HTTPS"

### 3. Origin Certificate
- Generate origin certificate in Cloudflare
- Install on server

## Nginx Configuration (if using reverse proxy)

```nginx
server {
    listen 443 ssl http2;
    server_name princevibe.com www.princevibe.com;
    
    ssl_certificate /etc/ssl/princevibe/certificate.crt;
    ssl_certificate_key /etc/ssl/princevibe/private.key;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name princevibe.com www.princevibe.com;
    return 301 https://$server_name$request_uri;
}
```

## Apache Configuration

```apache
<VirtualHost *:443>
    ServerName princevibe.com
    ServerAlias www.princevibe.com
    
    SSLEngine on
    SSLCertificateFile /etc/ssl/princevibe/certificate.crt
    SSLCertificateKeyFile /etc/ssl/princevibe/private.key
    
    # Modern SSL configuration
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305
    SSLHonorCipherOrder off
    SSLSessionTickets off
    
    # HSTS
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    
    ProxyPass / http://localhost:5000/
    ProxyPassReverse / http://localhost:5000/
    ProxyPreserveHost On
</VirtualHost>
```

## Environment Variables Update

Update your production.env file:
```env
ENABLE_HTTPS=true
SSL_CERT_PATH=/etc/ssl/princevibe/certificate.crt
SSL_KEY_PATH=/etc/ssl/princevibe/private.key
```

## Testing SSL

### 1. SSL Labs Test
https://www.ssllabs.com/ssltest/

### 2. Security Headers
https://securityheaders.com/

### 3. Local Testing
```bash
# Test certificate
openssl x509 -in /etc/ssl/princevibe/certificate.crt -text -noout

# Test SSL connection
openssl s_client -connect princevibe.com:443 -servername princevibe.com
```

## Troubleshooting

### Common Issues
1. **Mixed Content**: Ensure all resources use HTTPS
2. **Certificate Chain**: Include intermediate certificates
3. **Permissions**: Key file should be 600, cert file 644
4. **Firewall**: Open port 443

### Certificate Renewal
- Let's Encrypt: Auto-renews every 90 days
- Commercial: Manual renewal required (usually yearly)

### Monitoring
- Set up monitoring for certificate expiry
- Use tools like SSL Checker or Pingdom
EOF

    print_message "Production SSL guide created: $guide_file" $GREEN
}

# Function to validate certificate
validate_certificate() {
    print_message "Validating certificate..." $BLUE
    
    if openssl x509 -in "$CERTIFICATE" -noout -checkend 86400; then
        print_message "Certificate is valid and not expiring in the next day" $GREEN
    else
        print_message "Certificate validation failed or expiring soon" $RED
    fi
    
    # Check if private key matches certificate
    if [ "$(openssl rsa -in "$PRIVATE_KEY" -pubout 2>/dev/null | openssl md5)" = "$(openssl x509 -in "$CERTIFICATE" -pubkey -noout | openssl md5)" ]; then
        print_message "Private key matches certificate" $GREEN
    else
        print_message "Private key does not match certificate" $RED
    fi
}

# Function to set up development HTTPS
setup_development() {
    print_message "Setting up development HTTPS with self-signed certificate..." $YELLOW
    
    create_ssl_dir
    generate_openssl_config
    generate_private_key
    generate_self_signed
    display_cert_info
    validate_certificate
    
    print_message "\nDevelopment SSL setup complete!" $GREEN
    print_message "To use HTTPS in development:" $BLUE
    print_message "1. Update your .env file:" $YELLOW
    print_message "   ENABLE_HTTPS=true" $YELLOW
    print_message "   SSL_CERT_PATH=$CERTIFICATE" $YELLOW
    print_message "   SSL_KEY_PATH=$PRIVATE_KEY" $YELLOW
    print_message "2. Start your server and visit https://localhost:5000" $YELLOW
    print_message "3. Accept the browser security warning (self-signed certificate)" $YELLOW
}

# Function to set up production
setup_production() {
    print_message "Setting up production SSL..." $YELLOW
    
    create_ssl_dir
    generate_openssl_config
    generate_private_key
    generate_csr
    create_production_guide
    
    print_message "\nProduction SSL setup prepared!" $GREEN
    print_message "Next steps:" $BLUE
    print_message "1. Use the CSR file: $CSR_FILE" $YELLOW
    print_message "2. Follow the production guide: $SSL_DIR/production-ssl-guide.md" $YELLOW
    print_message "3. Install the certificate from your SSL provider" $YELLOW
}

# Main function
main() {
    print_message "Prince Vibe SSL Certificate Generator" $BLUE
    print_message "=====================================" $BLUE
    
    # Check for required tools
    command -v openssl >/dev/null 2>&1 || { 
        print_message "OpenSSL is required but not installed. Aborting." $RED
        exit 1
    }
    
    # Menu
    echo
    print_message "Select an option:" $BLUE
    echo "1) Development HTTPS (self-signed certificate)"
    echo "2) Production HTTPS (generate CSR for commercial certificate)"
    echo "3) Exit"
    echo
    
    read -p "Enter your choice (1-3): " choice
    
    case $choice in
        1)
            check_root
            setup_development
            ;;
        2)
            check_root
            setup_production
            ;;
        3)
            print_message "Exiting..." $YELLOW
            exit 0
            ;;
        *)
            print_message "Invalid option. Exiting..." $RED
            exit 1
            ;;
    esac
}

# Run main function
main "$@" 
 
 
 

# SSL Certificate Generation Script for Prince Vibe E-Commerce
# This script generates SSL certificates for HTTPS deployment

set -e

# Configuration
DOMAIN="princevibe.com"
WILDCARD_DOMAIN="*.princevibe.com"
SSL_DIR="/etc/ssl/princevibe"
PRIVATE_KEY="$SSL_DIR/private.key"
CERTIFICATE="$SSL_DIR/certificate.crt"
CSR_FILE="$SSL_DIR/certificate.csr"
CONFIG_FILE="$SSL_DIR/openssl.cnf"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_message() {
    echo -e "${2}${1}${NC}"
}

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_message "This script should be run as root for production SSL setup" $RED
        print_message "For development, you can run without sudo" $YELLOW
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
        SSL_DIR="./ssl"
        PRIVATE_KEY="$SSL_DIR/private.key"
        CERTIFICATE="$SSL_DIR/certificate.crt"
        CSR_FILE="$SSL_DIR/certificate.csr"
        CONFIG_FILE="$SSL_DIR/openssl.cnf"
    fi
}

# Function to create SSL directory
create_ssl_dir() {
    print_message "Creating SSL directory: $SSL_DIR" $BLUE
    mkdir -p "$SSL_DIR"
    chmod 755 "$SSL_DIR"
}

# Function to generate OpenSSL configuration
generate_openssl_config() {
    print_message "Generating OpenSSL configuration..." $BLUE
    
    cat > "$CONFIG_FILE" << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
req_extensions = req_ext
distinguished_name = dn

[dn]
C=PK
ST=Punjab
L=Lahore
O=Prince Vibe
OU=IT Department
emailAddress=admin@princevibe.com
CN=$DOMAIN

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = $DOMAIN
DNS.2 = www.$DOMAIN
DNS.3 = api.$DOMAIN
DNS.4 = admin.$DOMAIN
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

    print_message "OpenSSL configuration created" $GREEN
}

# Function to generate private key
generate_private_key() {
    print_message "Generating private key..." $BLUE
    
    openssl genrsa -out "$PRIVATE_KEY" 2048
    chmod 600 "$PRIVATE_KEY"
    
    print_message "Private key generated: $PRIVATE_KEY" $GREEN
}

# Function to generate certificate signing request
generate_csr() {
    print_message "Generating Certificate Signing Request (CSR)..." $BLUE
    
    openssl req -new -key "$PRIVATE_KEY" -out "$CSR_FILE" -config "$CONFIG_FILE"
    
    print_message "CSR generated: $CSR_FILE" $GREEN
}

# Function to generate self-signed certificate
generate_self_signed() {
    print_message "Generating self-signed certificate..." $BLUE
    
    openssl req -new -x509 -key "$PRIVATE_KEY" -out "$CERTIFICATE" -days 365 -config "$CONFIG_FILE" -extensions req_ext
    chmod 644 "$CERTIFICATE"
    
    print_message "Self-signed certificate generated: $CERTIFICATE" $GREEN
}

# Function to display certificate information
display_cert_info() {
    print_message "\nCertificate Information:" $BLUE
    openssl x509 -in "$CERTIFICATE" -text -noout | grep -E "(Subject:|DNS:|IP Address:|Not Before:|Not After:)"
}

# Function to create production deployment instructions
create_production_guide() {
    local guide_file="$SSL_DIR/production-ssl-guide.md"
    
    cat > "$guide_file" << 'EOF'
# Production SSL Certificate Setup Guide

## Option 1: Let's Encrypt (Recommended - Free)

### Install Certbot
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot

# CentOS/RHEL
sudo yum install certbot
```

### Generate Certificate
```bash
# For domain validation
sudo certbot certonly --standalone -d princevibe.com -d www.princevibe.com

# For wildcard (requires DNS validation)
sudo certbot certonly --manual --preferred-challenges=dns -d princevibe.com -d *.princevibe.com
```

### Auto-renewal
```bash
# Add to crontab
sudo crontab -e

# Add this line for auto-renewal
0 12 * * * /usr/bin/certbot renew --quiet
```

## Option 2: Commercial SSL Certificate

### 1. Generate CSR (already done by this script)
- Use the CSR file: `/etc/ssl/princevibe/certificate.csr`
- Submit to your SSL provider (Comodo, DigiCert, GoDaddy, etc.)

### 2. Install Certificate
- Replace `/etc/ssl/princevibe/certificate.crt` with provider's certificate
- Install intermediate certificates if provided

## Option 3: Cloudflare SSL (Recommended for ease)

### 1. Add domain to Cloudflare
- Sign up at cloudflare.com
- Add your domain
- Update nameservers

### 2. Enable SSL
- Go to SSL/TLS tab
- Set to "Full (strict)"
- Enable "Always Use HTTPS"

### 3. Origin Certificate
- Generate origin certificate in Cloudflare
- Install on server

## Nginx Configuration (if using reverse proxy)

```nginx
server {
    listen 443 ssl http2;
    server_name princevibe.com www.princevibe.com;
    
    ssl_certificate /etc/ssl/princevibe/certificate.crt;
    ssl_certificate_key /etc/ssl/princevibe/private.key;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name princevibe.com www.princevibe.com;
    return 301 https://$server_name$request_uri;
}
```

## Apache Configuration

```apache
<VirtualHost *:443>
    ServerName princevibe.com
    ServerAlias www.princevibe.com
    
    SSLEngine on
    SSLCertificateFile /etc/ssl/princevibe/certificate.crt
    SSLCertificateKeyFile /etc/ssl/princevibe/private.key
    
    # Modern SSL configuration
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305
    SSLHonorCipherOrder off
    SSLSessionTickets off
    
    # HSTS
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    
    ProxyPass / http://localhost:5000/
    ProxyPassReverse / http://localhost:5000/
    ProxyPreserveHost On
</VirtualHost>
```

## Environment Variables Update

Update your production.env file:
```env
ENABLE_HTTPS=true
SSL_CERT_PATH=/etc/ssl/princevibe/certificate.crt
SSL_KEY_PATH=/etc/ssl/princevibe/private.key
```

## Testing SSL

### 1. SSL Labs Test
https://www.ssllabs.com/ssltest/

### 2. Security Headers
https://securityheaders.com/

### 3. Local Testing
```bash
# Test certificate
openssl x509 -in /etc/ssl/princevibe/certificate.crt -text -noout

# Test SSL connection
openssl s_client -connect princevibe.com:443 -servername princevibe.com
```

## Troubleshooting

### Common Issues
1. **Mixed Content**: Ensure all resources use HTTPS
2. **Certificate Chain**: Include intermediate certificates
3. **Permissions**: Key file should be 600, cert file 644
4. **Firewall**: Open port 443

### Certificate Renewal
- Let's Encrypt: Auto-renews every 90 days
- Commercial: Manual renewal required (usually yearly)

### Monitoring
- Set up monitoring for certificate expiry
- Use tools like SSL Checker or Pingdom
EOF

    print_message "Production SSL guide created: $guide_file" $GREEN
}

# Function to validate certificate
validate_certificate() {
    print_message "Validating certificate..." $BLUE
    
    if openssl x509 -in "$CERTIFICATE" -noout -checkend 86400; then
        print_message "Certificate is valid and not expiring in the next day" $GREEN
    else
        print_message "Certificate validation failed or expiring soon" $RED
    fi
    
    # Check if private key matches certificate
    if [ "$(openssl rsa -in "$PRIVATE_KEY" -pubout 2>/dev/null | openssl md5)" = "$(openssl x509 -in "$CERTIFICATE" -pubkey -noout | openssl md5)" ]; then
        print_message "Private key matches certificate" $GREEN
    else
        print_message "Private key does not match certificate" $RED
    fi
}

# Function to set up development HTTPS
setup_development() {
    print_message "Setting up development HTTPS with self-signed certificate..." $YELLOW
    
    create_ssl_dir
    generate_openssl_config
    generate_private_key
    generate_self_signed
    display_cert_info
    validate_certificate
    
    print_message "\nDevelopment SSL setup complete!" $GREEN
    print_message "To use HTTPS in development:" $BLUE
    print_message "1. Update your .env file:" $YELLOW
    print_message "   ENABLE_HTTPS=true" $YELLOW
    print_message "   SSL_CERT_PATH=$CERTIFICATE" $YELLOW
    print_message "   SSL_KEY_PATH=$PRIVATE_KEY" $YELLOW
    print_message "2. Start your server and visit https://localhost:5000" $YELLOW
    print_message "3. Accept the browser security warning (self-signed certificate)" $YELLOW
}

# Function to set up production
setup_production() {
    print_message "Setting up production SSL..." $YELLOW
    
    create_ssl_dir
    generate_openssl_config
    generate_private_key
    generate_csr
    create_production_guide
    
    print_message "\nProduction SSL setup prepared!" $GREEN
    print_message "Next steps:" $BLUE
    print_message "1. Use the CSR file: $CSR_FILE" $YELLOW
    print_message "2. Follow the production guide: $SSL_DIR/production-ssl-guide.md" $YELLOW
    print_message "3. Install the certificate from your SSL provider" $YELLOW
}

# Main function
main() {
    print_message "Prince Vibe SSL Certificate Generator" $BLUE
    print_message "=====================================" $BLUE
    
    # Check for required tools
    command -v openssl >/dev/null 2>&1 || { 
        print_message "OpenSSL is required but not installed. Aborting." $RED
        exit 1
    }
    
    # Menu
    echo
    print_message "Select an option:" $BLUE
    echo "1) Development HTTPS (self-signed certificate)"
    echo "2) Production HTTPS (generate CSR for commercial certificate)"
    echo "3) Exit"
    echo
    
    read -p "Enter your choice (1-3): " choice
    
    case $choice in
        1)
            check_root
            setup_development
            ;;
        2)
            check_root
            setup_production
            ;;
        3)
            print_message "Exiting..." $YELLOW
            exit 0
            ;;
        *)
            print_message "Invalid option. Exiting..." $RED
            exit 1
            ;;
    esac
}

# Run main function
main "$@" 

# SSL Certificate Generation Script for Prince Vibe E-Commerce
# This script generates SSL certificates for HTTPS deployment

set -e

# Configuration
DOMAIN="princevibe.com"
WILDCARD_DOMAIN="*.princevibe.com"
SSL_DIR="/etc/ssl/princevibe"
PRIVATE_KEY="$SSL_DIR/private.key"
CERTIFICATE="$SSL_DIR/certificate.crt"
CSR_FILE="$SSL_DIR/certificate.csr"
CONFIG_FILE="$SSL_DIR/openssl.cnf"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_message() {
    echo -e "${2}${1}${NC}"
}

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_message "This script should be run as root for production SSL setup" $RED
        print_message "For development, you can run without sudo" $YELLOW
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
        SSL_DIR="./ssl"
        PRIVATE_KEY="$SSL_DIR/private.key"
        CERTIFICATE="$SSL_DIR/certificate.crt"
        CSR_FILE="$SSL_DIR/certificate.csr"
        CONFIG_FILE="$SSL_DIR/openssl.cnf"
    fi
}

# Function to create SSL directory
create_ssl_dir() {
    print_message "Creating SSL directory: $SSL_DIR" $BLUE
    mkdir -p "$SSL_DIR"
    chmod 755 "$SSL_DIR"
}

# Function to generate OpenSSL configuration
generate_openssl_config() {
    print_message "Generating OpenSSL configuration..." $BLUE
    
    cat > "$CONFIG_FILE" << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
req_extensions = req_ext
distinguished_name = dn

[dn]
C=PK
ST=Punjab
L=Lahore
O=Prince Vibe
OU=IT Department
emailAddress=admin@princevibe.com
CN=$DOMAIN

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = $DOMAIN
DNS.2 = www.$DOMAIN
DNS.3 = api.$DOMAIN
DNS.4 = admin.$DOMAIN
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

    print_message "OpenSSL configuration created" $GREEN
}

# Function to generate private key
generate_private_key() {
    print_message "Generating private key..." $BLUE
    
    openssl genrsa -out "$PRIVATE_KEY" 2048
    chmod 600 "$PRIVATE_KEY"
    
    print_message "Private key generated: $PRIVATE_KEY" $GREEN
}

# Function to generate certificate signing request
generate_csr() {
    print_message "Generating Certificate Signing Request (CSR)..." $BLUE
    
    openssl req -new -key "$PRIVATE_KEY" -out "$CSR_FILE" -config "$CONFIG_FILE"
    
    print_message "CSR generated: $CSR_FILE" $GREEN
}

# Function to generate self-signed certificate
generate_self_signed() {
    print_message "Generating self-signed certificate..." $BLUE
    
    openssl req -new -x509 -key "$PRIVATE_KEY" -out "$CERTIFICATE" -days 365 -config "$CONFIG_FILE" -extensions req_ext
    chmod 644 "$CERTIFICATE"
    
    print_message "Self-signed certificate generated: $CERTIFICATE" $GREEN
}

# Function to display certificate information
display_cert_info() {
    print_message "\nCertificate Information:" $BLUE
    openssl x509 -in "$CERTIFICATE" -text -noout | grep -E "(Subject:|DNS:|IP Address:|Not Before:|Not After:)"
}

# Function to create production deployment instructions
create_production_guide() {
    local guide_file="$SSL_DIR/production-ssl-guide.md"
    
    cat > "$guide_file" << 'EOF'
# Production SSL Certificate Setup Guide

## Option 1: Let's Encrypt (Recommended - Free)

### Install Certbot
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot

# CentOS/RHEL
sudo yum install certbot
```

### Generate Certificate
```bash
# For domain validation
sudo certbot certonly --standalone -d princevibe.com -d www.princevibe.com

# For wildcard (requires DNS validation)
sudo certbot certonly --manual --preferred-challenges=dns -d princevibe.com -d *.princevibe.com
```

### Auto-renewal
```bash
# Add to crontab
sudo crontab -e

# Add this line for auto-renewal
0 12 * * * /usr/bin/certbot renew --quiet
```

## Option 2: Commercial SSL Certificate

### 1. Generate CSR (already done by this script)
- Use the CSR file: `/etc/ssl/princevibe/certificate.csr`
- Submit to your SSL provider (Comodo, DigiCert, GoDaddy, etc.)

### 2. Install Certificate
- Replace `/etc/ssl/princevibe/certificate.crt` with provider's certificate
- Install intermediate certificates if provided

## Option 3: Cloudflare SSL (Recommended for ease)

### 1. Add domain to Cloudflare
- Sign up at cloudflare.com
- Add your domain
- Update nameservers

### 2. Enable SSL
- Go to SSL/TLS tab
- Set to "Full (strict)"
- Enable "Always Use HTTPS"

### 3. Origin Certificate
- Generate origin certificate in Cloudflare
- Install on server

## Nginx Configuration (if using reverse proxy)

```nginx
server {
    listen 443 ssl http2;
    server_name princevibe.com www.princevibe.com;
    
    ssl_certificate /etc/ssl/princevibe/certificate.crt;
    ssl_certificate_key /etc/ssl/princevibe/private.key;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name princevibe.com www.princevibe.com;
    return 301 https://$server_name$request_uri;
}
```

## Apache Configuration

```apache
<VirtualHost *:443>
    ServerName princevibe.com
    ServerAlias www.princevibe.com
    
    SSLEngine on
    SSLCertificateFile /etc/ssl/princevibe/certificate.crt
    SSLCertificateKeyFile /etc/ssl/princevibe/private.key
    
    # Modern SSL configuration
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305
    SSLHonorCipherOrder off
    SSLSessionTickets off
    
    # HSTS
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    
    ProxyPass / http://localhost:5000/
    ProxyPassReverse / http://localhost:5000/
    ProxyPreserveHost On
</VirtualHost>
```

## Environment Variables Update

Update your production.env file:
```env
ENABLE_HTTPS=true
SSL_CERT_PATH=/etc/ssl/princevibe/certificate.crt
SSL_KEY_PATH=/etc/ssl/princevibe/private.key
```

## Testing SSL

### 1. SSL Labs Test
https://www.ssllabs.com/ssltest/

### 2. Security Headers
https://securityheaders.com/

### 3. Local Testing
```bash
# Test certificate
openssl x509 -in /etc/ssl/princevibe/certificate.crt -text -noout

# Test SSL connection
openssl s_client -connect princevibe.com:443 -servername princevibe.com
```

## Troubleshooting

### Common Issues
1. **Mixed Content**: Ensure all resources use HTTPS
2. **Certificate Chain**: Include intermediate certificates
3. **Permissions**: Key file should be 600, cert file 644
4. **Firewall**: Open port 443

### Certificate Renewal
- Let's Encrypt: Auto-renews every 90 days
- Commercial: Manual renewal required (usually yearly)

### Monitoring
- Set up monitoring for certificate expiry
- Use tools like SSL Checker or Pingdom
EOF

    print_message "Production SSL guide created: $guide_file" $GREEN
}

# Function to validate certificate
validate_certificate() {
    print_message "Validating certificate..." $BLUE
    
    if openssl x509 -in "$CERTIFICATE" -noout -checkend 86400; then
        print_message "Certificate is valid and not expiring in the next day" $GREEN
    else
        print_message "Certificate validation failed or expiring soon" $RED
    fi
    
    # Check if private key matches certificate
    if [ "$(openssl rsa -in "$PRIVATE_KEY" -pubout 2>/dev/null | openssl md5)" = "$(openssl x509 -in "$CERTIFICATE" -pubkey -noout | openssl md5)" ]; then
        print_message "Private key matches certificate" $GREEN
    else
        print_message "Private key does not match certificate" $RED
    fi
}

# Function to set up development HTTPS
setup_development() {
    print_message "Setting up development HTTPS with self-signed certificate..." $YELLOW
    
    create_ssl_dir
    generate_openssl_config
    generate_private_key
    generate_self_signed
    display_cert_info
    validate_certificate
    
    print_message "\nDevelopment SSL setup complete!" $GREEN
    print_message "To use HTTPS in development:" $BLUE
    print_message "1. Update your .env file:" $YELLOW
    print_message "   ENABLE_HTTPS=true" $YELLOW
    print_message "   SSL_CERT_PATH=$CERTIFICATE" $YELLOW
    print_message "   SSL_KEY_PATH=$PRIVATE_KEY" $YELLOW
    print_message "2. Start your server and visit https://localhost:5000" $YELLOW
    print_message "3. Accept the browser security warning (self-signed certificate)" $YELLOW
}

# Function to set up production
setup_production() {
    print_message "Setting up production SSL..." $YELLOW
    
    create_ssl_dir
    generate_openssl_config
    generate_private_key
    generate_csr
    create_production_guide
    
    print_message "\nProduction SSL setup prepared!" $GREEN
    print_message "Next steps:" $BLUE
    print_message "1. Use the CSR file: $CSR_FILE" $YELLOW
    print_message "2. Follow the production guide: $SSL_DIR/production-ssl-guide.md" $YELLOW
    print_message "3. Install the certificate from your SSL provider" $YELLOW
}

# Main function
main() {
    print_message "Prince Vibe SSL Certificate Generator" $BLUE
    print_message "=====================================" $BLUE
    
    # Check for required tools
    command -v openssl >/dev/null 2>&1 || { 
        print_message "OpenSSL is required but not installed. Aborting." $RED
        exit 1
    }
    
    # Menu
    echo
    print_message "Select an option:" $BLUE
    echo "1) Development HTTPS (self-signed certificate)"
    echo "2) Production HTTPS (generate CSR for commercial certificate)"
    echo "3) Exit"
    echo
    
    read -p "Enter your choice (1-3): " choice
    
    case $choice in
        1)
            check_root
            setup_development
            ;;
        2)
            check_root
            setup_production
            ;;
        3)
            print_message "Exiting..." $YELLOW
            exit 0
            ;;
        *)
            print_message "Invalid option. Exiting..." $RED
            exit 1
            ;;
    esac
}

# Run main function
main "$@" 
 
 
 