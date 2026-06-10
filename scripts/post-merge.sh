#!/bin/bash
set -e
npm install
npx prisma migrate deploy
npx prisma generate
