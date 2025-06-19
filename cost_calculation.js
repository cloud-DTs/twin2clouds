"use strict";

let pricing;

// Load JSON Pricing Data
async function loadPricingData() {
  try {
    const response = await fetch("./pricing.json"); // Fetch JSON file
    pricing = await response.json(); // Parse JSON into JavaScript object
  } catch (error) {
    console.error("Error loading pricing data:", error);
  }
}

async function calculateCosts() {
  if (!pricing) {
    await loadPricingData();
  }
  const numberOfDevices = parseInt(document.getElementById("devices").value);
  const deviceSendingIntervalInMinutes = parseFloat(
    document.getElementById("interval").value
  );
  const averageSizeOfMessageInKb = parseFloat(
    document.getElementById("messageSize").value
  );
  const hotStorageDurationInMonths = parseInt(
    document.getElementById("hotStorageDurationInMonths").value
  );
  const coolStorageDurationInMonths = parseInt(
    document.getElementById("coolStorageDurationInMonths").value
  );
  const archiveStorageDurationInMonths = parseInt(
    document.getElementById("archiveStorageDurationInMonths").value
  );
  const needs3DModel = document.querySelector(
    'input[name="needs3DModel"]:checked'
  ).value;
  let entityCount = 0;
  if (needs3DModel === "yes") {
    entityCount = parseInt(document.getElementById("entityCount").value);
  }
  const amountOfActiveEditors = parseInt(
    document.getElementById("monthlyEditors").value
  );

  const amountOfActiveViewers = parseInt(
    document.getElementById("monthlyViewers").value
  );

  const dashboardRefreshesPerHour = parseInt(
    document.getElementById("dashboardRefreshesPerHour").value
  ); 

  const dashboardActiveHoursPerDay = parseInt(
    document.getElementById("dashboardActiveHoursPerDay").value
  ); 

  // Validate inputs
  if (
    isNaN(numberOfDevices) ||
    isNaN(deviceSendingIntervalInMinutes) ||
    isNaN(averageSizeOfMessageInKb) ||
    numberOfDevices <= 0 ||
    deviceSendingIntervalInMinutes <= 0 ||
    averageSizeOfMessageInKb <= 0 ||
    isNaN(entityCount) ||
    isNaN(amountOfActiveEditors) ||
    isNaN(amountOfActiveViewers) ||
    amountOfActiveEditors < 0 ||
    amountOfActiveViewers < 0
  ) {
    document.getElementById("result").classList.remove("displayed");
    document.getElementById("result").innerHTML =
      "All inputs are required. Only positive values are allowed.";
    document.getElementById("result").classList.add("error");
    return;
  }

  if (hotStorageDurationInMonths > coolStorageDurationInMonths) {
    document.getElementById("result").classList.remove("displayed");
    document.getElementById("result").innerHTML =
      "Hot storage duration cannot be longer than cool storage duration.";
    document.getElementById("result").classList.add("error");
    return;
  }

  if (hotStorageDurationInMonths > archiveStorageDurationInMonths) {
    document.getElementById("result").classList.remove("displayed");
    document.getElementById("result").innerHTML =
      "Hot storage duration cannot be longer than archive storage duration.";
    document.getElementById("result").classList.add("error");
    return;
  }

  if (coolStorageDurationInMonths > archiveStorageDurationInMonths) {
    document.getElementById("result").classList.remove("displayed");
    document.getElementById("result").innerHTML =
      "Cool storage duration cannot be longer than archive storage duration.";
    document.getElementById("result").classList.add("error");
    return;
  }

  const awsResultDataAcquisition = calculateAWSCostDataAcquisition(
    numberOfDevices,
    deviceSendingIntervalInMinutes,
    averageSizeOfMessageInKb
  );

  const azureResultDataAcquisition = calculateAzureCostDataAcquisition(
    numberOfDevices,
    deviceSendingIntervalInMinutes,
    averageSizeOfMessageInKb
  );

  const awsResultDataProcessing = calculateAWSCostDataProcessing(
    numberOfDevices,
    deviceSendingIntervalInMinutes,
    averageSizeOfMessageInKb
  );

  const azureResultDataProcessing = calculateAzureCostDataProcessing(
    numberOfDevices,
    deviceSendingIntervalInMinutes,
    averageSizeOfMessageInKb
  );

  const transferCostFromL2AWSToAWSHot = calculateTransferCostFromL2AWSToAWSHot(
    awsResultDataProcessing.dataSizeInGB
  );

  const transferCostFromL2AWSToAzureHot =
    calculateTransferCostFromL2AWSToAzureHot(awsResultDataProcessing.dataSizeInGB);

  const transferCostFromL2AzureToAWSHot =
    calculateTransferCostFromL2AzureToAWSHot(azureResultDataProcessing.dataSizeInGB);

  const transferCostFromL2AzureToAzureHot =
    calculateTransferCostFromL2AzureToAzureHot(azureResultDataProcessing.dataSizeInGB);

  const awsResultHot = calculateDynamoDBCost(
    awsResultDataProcessing.dataSizeInGB,
    awsResultDataProcessing.totalMessagesPerMonth,
    averageSizeOfMessageInKb,
    hotStorageDurationInMonths
  );

  const azureResultHot = calculateCosmosDBCost(
    azureResultDataProcessing.dataSizeInGB,
    azureResultDataProcessing.totalMessagesPerMonth,
    averageSizeOfMessageInKb,
    hotStorageDurationInMonths
  );

  const transferCostFromAWSHotToAWSCool =
    calculateTransferCostFromAWSHotToAWSCool(awsResultHot.dataSizeInGB);

  const transferCostFromAWSHotToAzureCool =
    calculateTransferCostFromAWSHotToAzureCool(awsResultHot.dataSizeInGB);

  const transferCostFromAzureHotToAWSCool =
    calculateTransferCostsFromAzureHotToAWSCool(
      azureResultHot.dataSizeInGB
    );

  const transferCostFromAzureHotToAzureCool =
    calculateTransferCostFromAzureHotToAzureCool(
      azureResultHot.dataSizeInGB
    );

  const awsResultCool = calculateS3InfrequentAccessCost(
    awsResultHot.dataSizeInGB,
    coolStorageDurationInMonths
  );

  const azureResultLayer3Cool = calculateAzureBlobStorageCost(
    azureResultHot.dataSizeInGB,
    coolStorageDurationInMonths
  );

  const transferCostFromAWSCoolToAWSArchive =
    calculateTransferCostFromAWSCoolToAWSArchive(
      awsResultCool.dataSizeInGB
    );
  const transferCostFromAWSCoolToAzureArchive =
    calculateTransferCostFromAWSCoolToAzureArchive(
      awsResultCool.dataSizeInGB
    );
  const transferCostFromAzureCoolToAWSArchive =
    calculateTransferCostFromAzureCoolToAWSArchive(
      azureResultLayer3Cool.dataSizeInGB
    );
  const transferCostFromAzureCoolToAzureArchive =
    calculateTransferCostFromAzureCoolToAzureArchive(
      azureResultLayer3Cool.dataSizeInGB
    );

  const awsResultLayer3Archive = calculateS3GlacierDeepArchiveCost(
    awsResultCool.dataSizeInGB,
    archiveStorageDurationInMonths
  );

  const azureResultLayer3Archive = calculateAzureBlobStorageArchiveCost(
    azureResultLayer3Cool.dataSizeInGB,
    archiveStorageDurationInMonths
  );

  let awsResultLayer4 = null;
  let azureResultLayer4 = null;
  if (needs3DModel === "yes") {
    awsResultLayer4 = calculateAWSIoTTwinMakerCost(
      entityCount,
      numberOfDevices,
      deviceSendingIntervalInMinutes, 
      dashboardRefreshesPerHour, 
      dashboardActiveHoursPerDay
    );
  } else if (needs3DModel === "no") {
    azureResultLayer4 = calculateAzureDigitalTwinsCost(
      numberOfDevices,
      deviceSendingIntervalInMinutes, 
      averageSizeOfMessageInKb,
      dashboardRefreshesPerHour,
      dashboardActiveHoursPerDay
    );
    awsResultLayer4 = calculateAWSIoTTwinMakerCost(
        entityCount,
        numberOfDevices,
        deviceSendingIntervalInMinutes,
        dashboardRefreshesPerHour,
        dashboardActiveHoursPerDay
    );
  }

  const awsResultLayer5 = calculateAmazonManagedGrafanaCost(
    amountOfActiveEditors,
    amountOfActiveViewers
  );

  const azureResultLayer5 = calculateAzureManagedGrafanaCost(
    amountOfActiveEditors + amountOfActiveViewers
  );

  let transferCosts = {
    L1_AWS_to_AWS_Hot: transferCostFromL2AWSToAWSHot,
    L1_AWS_to_Azure_Hot: transferCostFromL2AWSToAzureHot,
    L1_Azure_to_AWS_Hot: transferCostFromL2AzureToAWSHot,
    L1_Azure_to_Azure_Hot: transferCostFromL2AzureToAzureHot,
    AWS_Hot_to_AWS_Cool: transferCostFromAWSHotToAWSCool,
    AWS_Hot_to_Azure_Cool: transferCostFromAWSHotToAzureCool,
    Azure_Hot_to_AWS_Cool: transferCostFromAzureHotToAWSCool,
    Azure_Hot_to_Azure_Cool: transferCostFromAzureHotToAzureCool,
    AWS_Cool_to_AWS_Archive: transferCostFromAWSCoolToAWSArchive,
    AWS_Cool_to_Azure_Archive: transferCostFromAWSCoolToAzureArchive,
    Azure_Cool_to_AWS_Archive: transferCostFromAzureCoolToAWSArchive,
    Azure_Cool_to_Azure_Archive: transferCostFromAzureCoolToAzureArchive,
    L2_AWS_Archive_to_L3_AWS: 0,
    L2_AWS_Archive_to_L3_Azure: 0,
    L2_Azure_Archive_to_L3_AWS: 0,
    L2_Azure_Archive_to_L3_Azure: 0,
    L4_AWS_to_L5_AWS: 0,
    L4_Azure_to_L5_Azure: 0,
  };

  let graph = buildGraphForStorage(
    awsResultHot,
    azureResultHot,
    awsResultCool,
    azureResultLayer3Cool,
    awsResultLayer3Archive,
    azureResultLayer3Archive,
    transferCosts
  );

  let cheapestStorage = findCheapestStoragePath(
    graph,
    ["AWS_Hot", "Azure_Hot"],
    ["AWS_Archive", "Azure_Archive"]
  );

  const awsCostsAfterLayer1 =
    awsResultDataAcquisition.totalMonthlyCost;
  //+ awsResultDataProcessing.totalMonthlyCost;

  const azureCostsAfterLayer1 =
    azureResultDataAcquisition.totalMonthlyCost;
  //+ azureResultDataProcessing.totalMonthlyCost;


  let cheaperProviderForLayer1;
  let cheaperProviderForLayer3;
  switch (cheapestStorage.path[0]) {
    case "AWS_Hot":
      cheaperProviderForLayer1 =
        awsCostsAfterLayer1 + transferCosts.L1_AWS_to_AWS_Hot <
        azureCostsAfterLayer1 + transferCosts.L1_Azure_to_AWS_Hot
          ? "L1_AWS"
          : "L1_Azure";
      cheaperProviderForLayer3 = "L3_AWS";
      break;
    case "Azure_Hot":
      cheaperProviderForLayer1 =
        awsCostsAfterLayer1 + transferCosts.L1_AWS_to_Azure_Hot <
        azureCostsAfterLayer1 + transferCosts.L1_Azure_to_Azure_Hot
          ? "L1_AWS"
          : "L1_Azure";
      cheaperProviderForLayer3 = "L3_Azure";
      break;
    default:
      console.log("Storage Path incorrect!");
  }

  let cheaperProviderLayer5 =
    awsResultLayer5.totalMonthlyCost < azureResultLayer5.totalMonthlyCost
      ? "L5_AWS"
      : "L5_Azure";

  let cheapestPath = [];

  cheapestPath.push(cheaperProviderForLayer1);
  cheapestStorage.path.map((x) => "L2_" + x).forEach((x) => cheapestPath.push(x));
  cheapestPath.push(cheaperProviderForLayer3);

  let cheaperProviderLayer4 = "";
  if (azureResultLayer4) {
    cheaperProviderLayer4 = azureResultLayer4.totalMonthlyCost < awsResultLayer4.totalMonthlyCost ? "L4_Azure" : "L4_AWS";
  } else {
    cheaperProviderLayer4 = "L4_AWS";
  }

  cheapestPath.push(cheaperProviderLayer4);
  cheapestPath.push(cheaperProviderLayer5);
  let formattedCheapestPath = cheapestPath
    .map((segment) => `<span class="path-segment">${segment}</span>`)
    .join('<span class="arrow">→</span>');

  let resultHTML = `
  <h2>Your most cost-efficient Digital Twin solution</h2>

  <div id="optimal-path">
    <div class="path-container">${formattedCheapestPath}</div>
  </div>

  <div class="cost-container">
    <!-- Layer 1 -->
    <div class="cost-card" onclick="flipCard(this)">
      <div class="card-front">
        <h3>Layer 1: Data Acquisition <span class="info-icon">ℹ️</span></h3>
        <p><strong>AWS:</strong> <span class="total-cost">$${awsResultDataAcquisition.totalMonthlyCost.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}</span></p>
        <p><strong>Azure:</strong> <span class="total-cost">$${azureResultDataAcquisition.totalMonthlyCost.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}</span></p>
      </div>
      <div class="card-back">
        <h3>Layer 1: Data Acquisition Info</h3>
        <p>This layer compares <a href="https://aws.amazon.com/de/iot-core/" target="_blank"><strong>AWS IoT Core</strong></a> vs. <a href="https://azure.microsoft.com/de-de/products/iot-hub" target="_blank"><strong>Azure IoT Hub</strong></a></p>
      </div>
    </div>

    <!-- Layer 2 Hot Storage -->
    <div class="cost-card" onclick="flipCard(this)">
      <div class="card-front">
        <h3>Layer 2: Hot Storage <span class="info-icon">ℹ️</span></h3>
        <p><strong>AWS:</strong> <span class="total-cost">$${awsResultHot.totalMonthlyCost.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}</span></p>
        <p><strong>Azure:</strong> <span class="total-cost">$${azureResultHot.totalMonthlyCost.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}</span></p>
      </div>
      <div class="card-back">
        <h3>Layer 2: Hot Storage Info</h3>
        <p>This layer compares the data storage for frequently accessed data in <a href="https://aws.amazon.com/de/dynamodb/" target="_blank"><strong>AWS DynamoDB</strong></a> vs. <a href="https://azure.microsoft.com/de-de/products/cosmos-db" target="_blank"><strong>Azure CosmosDB</strong></a> considering possible transfer costs.</p>
      </div>
    </div>

        <!-- Layer 2 Cool Storage -->
    <div class="cost-card" onclick="flipCard(this)">
      <div class="card-front">
        <h3>Layer 2: Cool Storage <span class="info-icon">ℹ️</span></h3>
        <p><strong>AWS:</strong> <span class="total-cost">$${awsResultCool.totalMonthlyCost.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}</span></p>
        <p><strong>Azure:</strong> <span class="total-cost">$${azureResultLayer3Cool.totalMonthlyCost.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}</span></p>
      </div>
      <div class="card-back">
        <h3>Layer 2: Cool Storage Info</h3>
        <p>This layer compares the data storage for inrequently accessed data in <a href="https://aws.amazon.com/de/s3/" target="_blank"><strong>AWS S3-Infrequent Access</strong></a> vs. <a href="https://azure.microsoft.com/en-us/products/storage/blobs" target="_blank"><strong>Azure BlobStorage (Cool Tier)</strong></a> considering possible transfer costs.</p>
      </div>
    </div>

    <!-- Layer 2 Archive Storage -->
    <div class="cost-card" onclick="flipCard(this)">
      <div class="card-front">
        <h3>Layer 2: Archive Storage <span class="info-icon">ℹ️</span></h3>
        <p><strong>AWS:</strong> <span class="total-cost">$${awsResultLayer3Archive.totalMonthlyCost.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}</span></p>
        <p><strong>Azure:</strong> <span class="total-cost">$${azureResultLayer3Archive.totalMonthlyCost.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}</span></p>
      </div>
      <div class="card-back">
        <h3>Layer 2: Archive Storage Info</h3>
        <p>This layer compares the data storage for archived data in <a href="https://aws.amazon.com/de/s3/storage-classes/glacier/" target="_blank"><strong>Amazon S3-Glacier Deep Archive</strong></a> vs. <a href="https://azure.microsoft.com/en-us/products/storage/blobs" target="_blank"><strong>Azure Blob Storage (Archive Tier)</strong></a>.</p>
      </div>
    </div>

    <!-- Layer 3 -->
    <div class="cost-card" onclick="flipCard(this)">
      <div class="card-front">
        <h3>Layer 3: Data Processing <span class="info-icon">ℹ️</span></h3>
        <p><strong>AWS:</strong> <span class="total-cost">$${awsResultDataProcessing.totalMonthlyCost.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}</span></p>
        <p><strong>Azure:</strong> <span class="total-cost">$${azureResultDataProcessing.totalMonthlyCost.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}</span></p>
      </div>
      <div class="card-back">
        <h3>Layer 3: Data Processing Info</h3>
          <p>This layer compares <a href="https://aws.amazon.com/de/lambda/" target="_blank"><strong>AWS Lambda</strong></a> vs. <a href="https://azure.microsoft.com/en-us/products/functions" target="_blank"><strong>Azure Functions</strong></a></p>
      </div>
    </div>

    <div class="cost-card" onclick="flipCard(this)">
      <div class="card-front">
        <h3>Layer 4: Twin Management <span class="info-icon">ℹ️</span></h3>
        ${
          awsResultLayer4
            ? `<p><strong>AWS:</strong> <span class="total-cost">$${awsResultLayer4.totalMonthlyCost.toLocaleString(
                "en-US",
                { minimumFractionDigits: 2, maximumFractionDigits: 2 }
              )}</span></p>`
            : ""
        }
        ${
          azureResultLayer4
            ? `<p><strong>Azure:</strong> <span class="total-cost">$${azureResultLayer4.totalMonthlyCost.toLocaleString(
                "en-US",
                { minimumFractionDigits: 2, maximumFractionDigits: 2 }
              )}</span></p>`
            : ""
        }
      </div>
      <div class="card-back">
        <h3>Layer 4: Twin Management Info</h3>
        <p>This layer uses either <a href="https://aws.amazon.com/iot-twinmaker/" target="_blank"><strong>AWS IoT TwinMaker</strong></a> or <a href="https://azure.microsoft.com/en-us/products/digital-twins" target="_blank"><strong>Azure Digital Twins</strong></a> depending on if a 3D model of the Digital Twin is necessary.</p>
      </div>
    </div>


        <!-- Layer 5 -->
    <div class="cost-card" onclick="flipCard(this)">
      <div class="card-front">
        <h3>Layer 5: Data Visualization <span class="info-icon">ℹ️</span></h3>
        <p><strong>AWS:</strong> <span class="total-cost">$${awsResultLayer5.totalMonthlyCost.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}</span></p>
        <p><strong>Azure:</strong> <span class="total-cost">$${azureResultLayer5.totalMonthlyCost.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}</span></p>
      </div>
      <div class="card-back">
        <h3>Layer 5: Data Visualization Info</h3>
        <p>This layer compares <a href="https://aws.amazon.com/de/grafana/" target="_blank"><strong>Amazon Managed Grafana</strong></a> vs. <a href="https://azure.microsoft.com/de-de/products/managed-grafana" target="_blank"><strong>Azure Managed Grafana</strong></a></p>
      </div>
    </div>

    
  </div>`;

  document.getElementById("result").classList.remove("error");
  document.getElementById("result").innerHTML = resultHTML;
}
