# Memorix Release Notification Scripts

This directory contains scripts for running automated tasks related to the Memorix application.

## Scripts

### checkReleasedCapsules.js

This script checks for capsules that have reached their release date and notifies recipients. It's designed to be run periodically using a task scheduler like cron.

#### How It Works

1. Finds all capsules whose release date has passed within the last 24 hours and haven't been marked as notified.
2. For each capsule:
   - Notifies the capsule creator that their capsule has been released
   - Notifies all recipients that a capsule has been shared with them
   - Marks the capsule as notified

#### Usage

You can run the script manually for testing:

```bash
node backend/scripts/checkReleasedCapsules.js
```

#### Setting Up Scheduled Execution

##### Using Cron (Linux/Mac)

To run the script every hour, add the following to your crontab:

```bash
# Edit crontab
crontab -e

# Add this line to run the script every hour
0 * * * * /usr/bin/node /path/to/your/project/backend/scripts/checkReleasedCapsules.js >> /path/to/logfile.log 2>&1
```

##### Using Task Scheduler (Windows)

1. Open Task Scheduler
2. Create a new task
3. Set up a trigger (e.g., hourly)
4. Set the action to:
   - Program/script: `node`
   - Arguments: `/path/to/your/project/backend/scripts/checkReleasedCapsules.js`

##### Using Serverless Functions

For production use, consider setting up a cloud function or scheduled task:

- AWS Lambda with CloudWatch Events
- Google Cloud Functions with Cloud Scheduler
- Azure Functions with Timer trigger

#### Additional Notes

- In production, implement proper email sending or push notification functionality
- Consider adding logging to a file or monitoring service
- For deployment, ensure environment variables are properly set up
