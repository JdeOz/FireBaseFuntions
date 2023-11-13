const functions = require("firebase-functions");
const {
  onNewFatalIssuePublished,
} = require("firebase-functions/v2/alerts/crashlytics");
const {
  onNewTesterIosDevicePublished,
} = require("firebase-functions/v2/alerts/appDistribution");
const {
  onThresholdAlertPublished,
} = require("firebase-functions/v2/alerts/performance");
const logger = require("firebase-functions/logger");

const fetch = require("node-fetch");

async function postMessageToDiscord(botName, messageBody) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error(
        "No webhook URL found. Set the Discord Webhook URL before deploying. Learn more about Discord webhooks here: https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks",
    );
  }

  return fetch(webhookUrl, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(
        {
          content: messageBody,
          username: botName,
        },
    ),
  });
}

exports.postfatalissuetodiscord = onNewFatalIssuePublished(async (event) => {
  const appId = event.appId;
  const {id, title, subtitle, appVersion} = event.data.payload.issue;
  const message = `
🚨 New fatal issue for ${appId} in version ${appVersion} 🚨

**${title}**

${subtitle}

id: \`${id}\`
`;

  try {
    const response = await postMessageToDiscord("Crashlytics Bot", message);
    if (response.ok) {
      logger.info(
          `Posted fatal Crashlytics alert ${id} for ${appId} to Discord`,
          event.data.payload,
      );
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    logger.error(
        `Unable to post fatal Crashlytics alert ${id} for ${appId} to Discord`,
        error,
    );
  }
});

exports.postNewUserAlertToDiscord =
functions.auth.user().onCreate(async (user) => {
  const message = `Nuevo usuario registrado: ${user.email} (UID: ${user.uid})`;

  try {
    const response = await postMessageToDiscord("Firebase Auth Bot", message);
    if (response.ok) {
      logger.info(`Posted new user alert for ${user.email} to Discord`);
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    logger.error(`Unable to post ${user.email} to Discord`, error);
  }
});
exports.postnewduuidtodiscord = onNewTesterIosDevicePublished(async (event) => {
  const appId = event.appId;
  const {
    testerDeviceIdentifier,
    testerDeviceModelName,
    testerEmail,
    testerName,
  } = event.data.payload;
  const message = `
📱 New iOS device registered by ${testerName} <${testerEmail}> for ${appId}

UDID **${testerDeviceIdentifier}** for ${testerDeviceModelName}
`;

  try {
    const response = await postMessageToDiscord("AppDistribution Bot", message);
    if (response.ok) {
      logger.info(
          `Posted iOS device registration alert for ${testerEmail} to Discord`,
      );
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    logger.error(
        `Unable to post iOS device registration for ${testerEmail} to Discord`,
        error,
    );
  }
});

exports.postperformancealerttodiscord = onThresholdAlertPublished(
    async (event) => {
      const appId = event.appId;
      const {
        eventName,
        metricType,
        eventType,
        numSamples,
        thresholdValue,
        thresholdUnit,
        conditionPercentile,
        appVersion,
        violationValue,
        violationUnit,
        investigateUri,
      } = event.data.payload;
      const message = `
    ⚠️ Performance Alert for ${metricType} of ${eventType}: **${eventName}** ⚠️
    
    App id: ${appId}
    Alert condition: ${thresholdValue} ${thresholdUnit}
    Percentile (if applicable): ${conditionPercentile}
    App version (if applicable): ${appVersion}
    
    Violation: ${violationValue} ${violationUnit}
    Number of samples checked: ${numSamples}
    
    **Investigate more:** ${investigateUri}
    `;

      try {
        const response = await postMessageToDiscord(
            "Firebase Performance Bot", message);
        if (response.ok) {
          logger.info(
              `Posted Firebase Performance alert ${eventName} to Discord`,
              event.data.payload,
          );
        } else {
          throw new Error(response.error);
        }
      } catch (error) {
        logger.error(
            `Unable to post Firebase Performance alert ${eventName} to Discord`,
            error,
        );
      }
    });
