# Enable Cloud Pub/Sub API

## Error

```
Cloud Pub/Sub API has not been used in project 316296641369 before or it is disabled.
```

## Solution

### Option 1: Enable via GCP Console (Recommended)

1. **Open the API enablement page**:
   - Visit: https://console.developers.google.com/apis/api/pubsub.googleapis.com/overview?project=316296641369
   - Or go to: https://console.cloud.google.com/apis/library/pubsub.googleapis.com?project=316296641369

2. **Click "Enable"** button

3. **Wait 1-2 minutes** for the API to propagate

4. **Restart the worker**:
   ```bash
   cd apps/worker
   pnpm dev
   ```

### Option 2: Enable via gcloud CLI

```bash
# Enable Pub/Sub API
gcloud services enable pubsub.googleapis.com --project=316296641369

# Verify it's enabled
gcloud services list --enabled --project=316296641369 | grep pubsub
```

### Option 3: Enable via API

```bash
# Using curl
curl -X POST \
  "https://serviceusage.googleapis.com/v1/projects/316296641369/services/pubsub.googleapis.com:enable" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json"
```

## Verify API is Enabled

After enabling, verify:

```bash
gcloud services list --enabled --project=316296641369 | grep pubsub
```

Should show:
```
pubsub.googleapis.com
```

## Create Topic and Subscription

After API is enabled, create the topic and subscription:

```bash
# Set your project
export PROJECT_ID=316296641369

# Create topic
gcloud pubsub topics create video.uploaded --project=$PROJECT_ID

# Create subscription
gcloud pubsub subscriptions create video-uploaded-dev-sub \
  --topic=video.uploaded \
  --project=$PROJECT_ID
```

## Test Subscription

Verify subscription exists:

```bash
gcloud pubsub subscriptions list --project=316296641369
```

Should show:
```
video-uploaded-dev-sub
```

## Restart Worker

After enabling the API and creating the subscription:

```bash
cd apps/worker
pnpm dev
```

Worker should now connect successfully without the API error.

## Common Issues

### "Permission denied"

If you get permission errors:
- Ensure your service account or user has "Service Usage Admin" role
- Or use a project owner account

### "API already enabled but still errors"

- Wait 2-3 minutes for propagation
- Check project ID matches in `.env` files
- Verify service account has Pub/Sub permissions

### "Subscription not found"

- Ensure subscription name matches `PUBSUB_SUBSCRIPTION_VIDEO_UPLOADED` in `.env`
- Create subscription if it doesn't exist
