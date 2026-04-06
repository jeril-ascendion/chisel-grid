# ChiselGrid Domain Setup — Complete

## Summary

| Item | Value |
|------|-------|
| **CloudFront Distribution ID** | EWLP3KOX3KKTV |
| **CloudFront Domain** | d1f3r42tp7znsx.cloudfront.net |
| **ACM Certificate ARN** | arn:aws:acm:us-east-1:852973339602:certificate/0677b964-22bc-4db1-93c5-cb7e63ca7c4e |
| **chiselgrid.com DNS** | A record → CloudFront (ALIAS) ✅ |
| **www.chiselgrid.com DNS** | A record → CloudFront (ALIAS) ✅ |
| **S3 Bucket** | chiselgrid-frontend-dev-storage |
| **CloudFront Invalidation** | I7QHUTWGEJ0XHOICLWL1KWZM8H ✅ |
| **curl https://chiselgrid.com** | HTTP/1.1 200 OK ✅ |
| **curl https://www.chiselgrid.com** | HTTP/1.1 200 OK ✅ |
| **Content Verified** | ChiselGrid / Ascendion Engineering content served ✅ |

## Steps Completed

1. ✅ **Identified CloudFront Distribution** — EWLP3KOX3KKTV from ChiselGrid-Dev-Storage stack
2. ✅ **ACM Certificate** — Requested in us-east-1, DNS validated via Route53, status ISSUED
3. ✅ **CloudFront Aliases** — Added chiselgrid.com + www.chiselgrid.com with ACM cert, TLSv1.2_2021
4. ✅ **Route53 DNS Records** — A record aliases for both domains pointing to CloudFront
5. ✅ **Build & Deploy** — Built develop branch, synced static assets + HTML to S3
6. ✅ **Verification** — Both domains return 200 with ChiselGrid content
7. ✅ **Updated .env.local** — NEXT_PUBLIC_APP_URL and NEXT_PUBLIC_API_URL set

## Date
2026-04-07
