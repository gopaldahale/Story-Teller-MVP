# Vercel Deployment Guide

This project is configured to deploy both frontend and backend to Vercel using serverless functions.

## Project Structure

- `frontend/` - React + Vite frontend application
- `api/` - Vercel serverless functions (backend API)
- `vercel.json` - Vercel configuration

## Prerequisites

1. Vercel account (sign up at [vercel.com](https://vercel.com))
2. Vercel CLI installed globally:
   ```bash
   npm i -g vercel
   ```

## Deployment Steps

### Step 1: Install Vercel CLI (if not already installed)

```bash
npm i -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Deploy to Vercel

From the project root directory:

```bash
vercel
```

Follow the prompts:
- Set up and deploy? **Yes**
- Which scope? (Select your account)
- Link to existing project? **No** (for first deployment)
- Project name? **story-ai-mvp** (or your preferred name)
- Directory? **./** (current directory)
- Override settings? **No**

### Step 4: Set Environment Variables

After deployment, set these environment variables in Vercel Dashboard:

1. Go to your project on [vercel.com](https://vercel.com)
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

   - `GEMINI_API_KEY` - Your Google Gemini API key
   - `ELEVENLABS_API_KEY` - Your ElevenLabs API key
   - `ELEVENLABS_VOICE_ID` - (Optional) Your ElevenLabs voice ID (default: "jUjRbhZWoMK4aDciW36V")

### Step 5: Redeploy After Adding Environment Variables

After adding environment variables, trigger a new deployment:

```bash
vercel --prod
```

Or redeploy from the Vercel Dashboard.

## Configuration Details

### Vercel Configuration (`vercel.json`)

- **Build Command**: Builds the frontend React app
- **Output Directory**: `frontend/dist` (Vite build output)
- **Framework**: Vite
- **Functions**: API routes in `api/` folder are automatically detected as serverless functions
- **Max Duration**: 60 seconds for API functions (to handle long-running AI generation)

### API Routes

The `api/generate.js` file is automatically deployed as a serverless function at `/api/generate`.

### Frontend API Calls

The frontend is configured to use `/api/generate` as the default API endpoint, which will work automatically on Vercel.

## Development

For local development, you can still use the original backend:

```bash
# Terminal 1: Start backend
cd backend
npm install
npm start

# Terminal 2: Start frontend
cd frontend
npm install
npm run dev
```

The frontend will use `http://localhost:4040/api/generate` in development (when `VITE_API_URL` is not set).

## Troubleshooting

### Function Timeout Errors

If you get timeout errors, the function might be taking too long. The max duration is set to 60 seconds in `vercel.json`. For longer processing, consider:
- Using Vercel Pro plan (allows up to 300 seconds)
- Optimizing the AI generation prompts

### Environment Variables Not Working

1. Make sure environment variables are set in Vercel Dashboard
2. Redeploy after adding/changing environment variables
3. Check that variable names match exactly (case-sensitive)

### Build Errors

If you encounter build errors:
1. Test locally: `cd frontend && npm run build`
2. Check that all dependencies are in `package.json`
3. Ensure Node.js version is compatible (Vercel uses Node 18.x by default)

## Production URL

After successful deployment, Vercel will provide you with a production URL like:
`https://story-ai-mvp.vercel.app`

You can also set up a custom domain in the Vercel Dashboard under **Settings** → **Domains**.
