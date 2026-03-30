#!/bin/bash
set -e
npm install
npx prisma migrate dev --skip-generate
