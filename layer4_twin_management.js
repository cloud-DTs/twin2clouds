"use strict";

function calculateAWSIoTTwinMakerCost(
  entityCount,
  numberOfDevices,
  deviceSendingIntervalInMinutes
) {
  const unifiedDataAccessAPICallsPrice =
    pricing.aws.iotTwinMaker.unifiedDataAccessAPICallsPrice;
  const entityPrice = pricing.aws.iotTwinMaker.entityPrice;
  const queryPrice = pricing.aws.iotTwinMaker.queryPrice;

  let totalMessagesPerMonth = Math.ceil(
    numberOfDevices * (1 / deviceSendingIntervalInMinutes) * 60 * 24 * 30
  );

  const totalMonthlyCost =
    entityCount * entityPrice +
    totalMessagesPerMonth * unifiedDataAccessAPICallsPrice +
    entityCount * 60 * 24 * 30 * queryPrice;

  return {
    provider: "AWS",
    totalMonthlyCost: totalMonthlyCost,
  };
}

function calculateAzureDigitalTwinsCost(
  numberOfDevices,
  deviceSendingIntervalInMinutes
) {
  const messagePrice = pricing.azure.azureDigitalTwins.messagePrice;
  const operationPrice = pricing.azure.azureDigitalTwins.operationPrice;
  const queryPrice = pricing.azure.azureDigitalTwins.queryPrice;

  let totalMessagesPerMonth = Math.ceil(
    numberOfDevices * (1 / deviceSendingIntervalInMinutes) * 60 * 24 * 30
  );

  const totalMonthlyCost =
    totalMessagesPerMonth * operationPrice +
    (numberOfDevices / 30) * 60 * 24 * 30 * queryPrice;
  return {
    provider: "Azure",
    totalMonthlyCost: totalMonthlyCost,
  };
}
