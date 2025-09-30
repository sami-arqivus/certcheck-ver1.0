#!/bin/sh
# entrypoint.sh

# Generate default.conf from template
envsubst '$APP_ENV' < /etc/nginx/conf.d/default.template > /etc/nginx/conf.d/default.conf

# Start nginx
nginx -g 'daemon off;'
