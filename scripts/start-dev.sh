#!/bin/bash
echo "🟢 Starting ChiselGrid development environment..."
bash ~/projects/chisel-grid/scripts/chiselgrid-aws.sh on
bash ~/projects/chisel-grid/scripts/chiselgrid-aws.sh wait
echo ""
echo "✅ AWS resources ready. Start local dev:"
echo "   cd ~/projects/chisel-grid"
echo "   pnpm dev --filter=@chiselgrid/web --filter=@chiselgrid/api"
echo ""
echo "   Local:  http://localhost:3000"
echo "   Live:   https://www.chiselgrid.com"
