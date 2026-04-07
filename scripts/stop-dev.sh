#!/bin/bash
echo "🔴 Stopping ChiselGrid AWS resources..."
bash ~/projects/chisel-grid/scripts/chiselgrid-aws.sh off
echo ""
echo "✅ Aurora stopped. Saving ~\$50/month."
echo "   S3 + CloudFront remain active (~\$5-8/month)"
echo "   chiselgrid.com stays live for readers"
