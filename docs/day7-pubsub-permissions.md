# Fix Pub/Sub "User not authorized" Error

## Error

```
Subscription error: StatusError: User not authorized to perform this action.
```

## Cause

The service account (or user account) being used doesn't have the required Pub/Sub permissions to pull messages from the subscription.

## Solution

### Step 1: Identify What Credentials Are Being Used

Check your worker environment file (`apps/worker/.env`):

```bash
# Check which credentials are set
cat apps/worker/.env | grep GOOGLE_APPLICATION_CREDENTIALS
```

If `GOOGLE_APPLICATION_CREDENTIALS` is set, the worker uses that service account.
If not set, it uses your default gcloud user credentials.

### Step 2: Grant Pub/Sub Permissions

#### Option A: Using Service Account (Recommended)

If using a service account:

1. **Get the service account email**:
   ```bash
   # From the JSON file
   cat $GOOGLE_APPLICATION_CREDENTIALS | grep client_email
   ```

2. **Grant Pub/Sub Subscriber role**:
   ```bash
   # Replace SERVICE_ACCOUNT_EMAIL with your actual service account email
   gcloud pubsub subscriptions add-iam-policy-binding video-uploaded-dev-sub \
     --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
     --role="roles/pubsub.subscriber" \
     --project=316296641369
   ```

3. **Also grant Pub/Sub Viewer (for subscription access)**:
   ```bash
   gcloud projects add-iam-policy-binding 316296641369 \
     --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
     --role="roles/pubsub.viewer"
   ```

#### Option B: Using User Account

If using your gcloud user account:

1. **Get your user email**:
   ```bash
   gcloud config get-value account
   ```

2. **Grant Pub/Sub Subscriber role**:
   ```bash
   gcloud pubsub subscriptions add-iam-policy-binding video-uploaded-dev-sub \
     --member="user:YOUR_EMAIL" \
     --role="roles/pubsub.subscriber" \
     --project=316296641369
   ```

### Step 3: Verify Subscription Exists

Check if the subscription exists:

```bash
gcloud pubsub subscriptions list --project=316296641369
```

If it doesn't exist, create it:

```bash
# Create topic (if not exists)
gcloud pubsub topics create video.uploaded --project=316296641369

# Create subscription
gcloud pubsub subscriptions create video-uploaded-dev-sub \
  --topic=video.uploaded \
  --project=316296641369
```

### Step 4: Grant Additional Permissions (If Needed)

For full access, you might also need:

```bash
# For service account
gcloud projects add-iam-policy-binding 316296641369 \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/pubsub.subscriber"

# Or for user
gcloud projects add-iam-policy-binding 316296641369 \
  --member="user:YOUR_EMAIL" \
  --role="roles/pubsub.subscriber"
```

## Quick Fix via GCP Console

### 1. Grant Subscription Permissions

1. Go to: https://console.cloud.google.com/cloudpubsub/subscription/list?project=316296641369
2. Click on `video-uploaded-dev-sub`
3. Click **"PERMISSIONS"** tab
4. Click **"ADD PRINCIPAL"**
5. Enter your service account email or user email
6. Select role: **"Pub/Sub Subscriber"**
7. Click **"SAVE"**

### 2. Grant Project-Level Permissions (Optional)

1. Go to: https://console.cloud.google.com/iam-admin/iam?project=316296641369
2. Click **"GRANT ACCESS"**
3. Enter your service account email or user email
4. Add role: **"Pub/Sub Subscriber"**
5. Click **"SAVE"**

## Verify Permissions

### Check Subscription IAM

```bash
gcloud pubsub subscriptions get-iam-policy video-uploaded-dev-sub \
  --project=316296641369
```

Should show your service account or user with `roles/pubsub.subscriber`.

### Test Access

After granting permissions, restart the worker:

```bash
cd apps/worker
pnpm dev
```

The error should be resolved.

## Required Roles Summary

For the worker to pull messages from Pub/Sub, the credentials need:

1. **`roles/pubsub.subscriber`** - Pull messages from subscription
2. **`roles/pubsub.viewer`** (optional) - View subscriptions and topics

## Common Issues

### "Subscription not found"

- Create the subscription first:
  ```bash
  gcloud pubsub subscriptions create video-uploaded-dev-sub \
    --topic=video.uploaded \
    --project=316296641369
  ```

### "Permission denied even after granting"

- Wait 1-2 minutes for IAM changes to propagate
- Verify you're using the correct service account
- Check project ID matches in all places

### "Service account not found"

- Verify the service account exists:
  ```bash
  gcloud iam service-accounts list --project=316296641369
  ```
- Ensure the JSON key file path is correct in `.env`

## Alternative: Use Pub/Sub Admin Role (Development Only)

For development, you can grant full Pub/Sub access:

```bash
# For service account
gcloud projects add-iam-policy-binding 316296641369 \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/pubsub.admin"

# For user
gcloud projects add-iam-policy-binding 316296641369 \
  --member="user:YOUR_EMAIL" \
  --role="roles/pubsub.admin"
```

**Note**: This is more permissive than needed. Use specific roles in production.
