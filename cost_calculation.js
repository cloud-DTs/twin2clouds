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

function discount(oldPrice, newPrice) {
  return ((oldPrice - newPrice) / oldPrice) * 100;
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

  const awsResultLayer1 = calculateAWSCostLayer1(
    numberOfDevices,
    deviceSendingIntervalInMinutes,
    averageSizeOfMessageInKb
  );

  const azureResultLayer1 = calculateAzureCostLayer1(
    numberOfDevices,
    deviceSendingIntervalInMinutes,
    averageSizeOfMessageInKb
  );

  const awsResultLayer2 = calculateAWSCostLayer2(
    numberOfDevices,
    deviceSendingIntervalInMinutes,
    averageSizeOfMessageInKb
  );

  const azureResultLayer2 = calculateAzureCostLayer2(
    numberOfDevices,
    deviceSendingIntervalInMinutes,
    averageSizeOfMessageInKb
  );

  const transferCostFromL2AWSToAWSHot = calculateTransferCostFromL2AWSToAWSHot(
    awsResultLayer2.dataSizeInGB
  );

  const transferCostFromL2AWSToAzureHot =
    calculateTransferCostFromL2AWSToAzureHot(awsResultLayer2.dataSizeInGB);

  const transferCostFromL2AzureToAWSHot =
    calculateTransferCostFromL2AzureToAWSHot(azureResultLayer2.dataSizeInGB);

  const transferCostFromL2AzureToAzureHot =
    calculateTransferCostFromL2AzureToAzureHot(azureResultLayer2.dataSizeInGB);

  const awsResultLayer3Hot = calculateDynamoDBCost(
    awsResultLayer2.dataSizeInGB,
    awsResultLayer2.totalMessagesPerMonth,
    averageSizeOfMessageInKb,
    hotStorageDurationInMonths
  );

  const azureResultLayer3Hot = calculateCosmosDBCost(
    azureResultLayer2.dataSizeInGB,
    azureResultLayer2.totalMessagesPerMonth,
    averageSizeOfMessageInKb,
    hotStorageDurationInMonths
  );

  const transferCostFromAWSHotToAWSCool =
    calculateTransferCostFromAWSHotToAWSCool(awsResultLayer3Hot.dataSizeInGB);

  const transferCostFromAWSHotToAzureCool =
    calculateTransferCostFromAWSHotToAzureCool(awsResultLayer3Hot.dataSizeInGB);

  const transferCostFromAzureHotToAWSCool =
    calculateTransferCostsFromAzureHotToAWSCool(
      azureResultLayer3Hot.dataSizeInGB
    );

  const transferCostFromAzureHotToAzureCool =
    calculateTransferCostFromAzureHotToAzureCool(
      azureResultLayer3Hot.dataSizeInGB
    );

  const awsResultLayer3Cool = calculateS3InfrequentAccessCost(
    awsResultLayer3Hot.dataSizeInGB,
    coolStorageDurationInMonths
  );

  const azureResultLayer3Cool = calculateAzureBlobStorageCost(
    azureResultLayer3Hot.dataSizeInGB,
    coolStorageDurationInMonths
  );

  const transferCostFromAWSCoolToAWSArchive =
    calculateTransferCostFromAWSCoolToAWSArchive(
      awsResultLayer3Cool.dataSizeInGB
    );
  const transferCostFromAWSCoolToAzureArchive =
    calculateTransferCostFromAWSCoolToAzureArchive(
      awsResultLayer3Cool.dataSizeInGB
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
    awsResultLayer3Cool.dataSizeInGB,
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
      deviceSendingIntervalInMinutes
    );
  } else if (needs3DModel === "no") {
    azureResultLayer4 = calculateAzureDigitalTwinsCost(
      numberOfDevices,
      deviceSendingIntervalInMinutes
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
    L1_AWS_to_L2_AWS: 0,
    L1_AWS_to_L2_Azure: Infinity,
    L1_Azure_to_L2_AWS: Infinity,
    L1_Azure_to_L2_Azure: 0,
    L2_AWS_to_L3_AWS_Hot: transferCostFromL2AWSToAWSHot,
    L2_AWS_to_L3_Azure_Hot: transferCostFromL2AWSToAzureHot,
    L2_Azure_to_L3_AWS_Hot: transferCostFromL2AzureToAWSHot,
    L2_Azure_to_L3_Azure_Hot: transferCostFromL2AzureToAzureHot,
    L3_AWS_Hot_to_L3_AWS_Cool: transferCostFromAWSHotToAWSCool,
    L3_AWS_Hot_to_L3_Azure_Cool: transferCostFromAWSHotToAzureCool,
    L3_Azure_Hot_to_L3_AWS_Cool: transferCostFromAzureHotToAWSCool,
    L3_Azure_Hot_to_L3_Azure_Cool: transferCostFromAzureHotToAzureCool,
    L3_AWS_Cool_to_L3_AWS_Archive: transferCostFromAWSCoolToAWSArchive,
    L3_AWS_Cool_to_L3_Azure_Archive: transferCostFromAWSCoolToAzureArchive,
    L3_Azure_Cool_to_L3_AWS_Archive: transferCostFromAzureCoolToAWSArchive,
    L3_Azure_Cool_to_L3_Azure_Archive: transferCostFromAzureCoolToAzureArchive,
    L3_AWS_Archive_to_L4_AWS: 0,
    L3_AWS_Archive_to_L4_Azure: 0,
    L3_Azure_Archive_to_L4_AWS: 0,
    L3_Azure_Archive_to_L4_Azure: 0,
    L4_AWS_to_L5_AWS: 0,
    L4_Azure_to_L5_Azure: 0,
  };

  let graph = buildGraphForStorage(
    awsResultLayer3Hot,
    azureResultLayer3Hot,
    awsResultLayer3Cool,
    azureResultLayer3Cool,
    awsResultLayer3Archive,
    azureResultLayer3Archive,
    transferCosts
  );

  let cheapestStorage = findCheapestStoragePath(
    graph,
    ["L3_AWS_Hot", "L3_Azure_Hot"],
    ["L3_AWS_Archive", "L3_Azure_Archive"]
  );

  const awsCostsAfterLayer2 =
    awsResultLayer1.totalMonthlyCost + awsResultLayer2.totalMonthlyCost;

  const azureCostsAfterLayer2 =
    azureResultLayer1.totalMonthlyCost + azureResultLayer2.totalMonthlyCost;

  let cheaperProviderForLayer1And2;
  switch (cheapestStorage.path[0]) {
    case "L3_AWS_Hot":
      cheaperProviderForLayer1And2 =
        awsCostsAfterLayer2 + transferCosts.L2_AWS_to_L3_AWS_Hot <
        azureCostsAfterLayer2 + transferCosts.L2_Azure_to_L3_AWS_Hot
          ? "AWS"
          : "Azure";
      break;
    case "L3_Azure_Hot":
      cheaperProviderForLayer1And2 =
        awsCostsAfterLayer2 + transferCosts.L2_AWS_to_L3_Azure_Hot <
        azureCostsAfterLayer2 + transferCosts.L2_Azure_to_L3_Azure_Hot
          ? "AWS"
          : "Azure";
      break;
    default:
      console.log("Storage Path incorrect!");
  }

  let cheaperProviderLayer5 =
    awsResultLayer5.totalMonthlyCost < azureResultLayer5.totalMonthlyCost
      ? "L5_AWS"
      : "L5_Azure";

  let cheapestPath = [];
  if (cheaperProviderForLayer1And2 === "AWS") {
    cheapestPath.push("L1_AWS");
    cheapestPath.push("L2_AWS");
  } else if (cheaperProviderForLayer1And2 === "Azure") {
    cheapestPath.push("L1_Azure");
    cheapestPath.push("L2_Azure");
  }
  cheapestStorage.path.forEach((x) => cheapestPath.push(x));
  cheapestPath.push(awsResultLayer4 ? "L4_AWS" : "L4_Azure");
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
        <p><strong>AWS:</strong> <span class="total-cost">$${awsResultLayer1.totalMonthlyCost.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}</span></p>
        <p><strong>Azure:</strong> <span class="total-cost">$${azureResultLayer1.totalMonthlyCost.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}</span></p>
      </div>
      <div class="card-back">
        <h3>Layer 1: Data Acquisition Info</h3>
        <p>This layer compares <a href="https://aws.amazon.com/de/iot-core/" target="_blank"><strong>AWS IoT Core</strong></a> vs. <a href="https://azure.microsoft.com/de-de/products/iot-hub" target="_blank"><strong>Azure IoT Hub</strong></a></p>
      </div>
    </div>

    <!-- Layer 2 -->
    <div class="cost-card" onclick="flipCard(this)">
      <div class="card-front">
        <h3>Layer 2: Data Processing <span class="info-icon">ℹ️</span></h3>
        <p><strong>AWS:</strong> <span class="total-cost">$${awsResultLayer2.totalMonthlyCost.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}</span></p>
        <p><strong>Azure:</strong> <span class="total-cost">$${azureResultLayer2.totalMonthlyCost.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}</span></p>
      </div>
      <div class="card-back">
        <h3>Layer 2: Data Processing Info</h3>
          <p>This layer compares <a href="https://aws.amazon.com/de/lambda/" target="_blank"><strong>AWS Lambda</strong></a> vs. <a href="https://azure.microsoft.com/en-us/products/functions" target="_blank"><strong>Azure Functions</strong></a></p>
      </div>
    </div>

    <!-- Layer 3 Hot Storage -->
    <div class="cost-card" onclick="flipCard(this)">
      <div class="card-front">
        <h3>Layer 3: Hot Storage <span class="info-icon">ℹ️</span></h3>
        <p><strong>AWS:</strong> <span class="total-cost">$${awsResultLayer3Hot.totalMonthlyCost.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}</span></p>
        <p><strong>Azure:</strong> <span class="total-cost">$${azureResultLayer3Hot.totalMonthlyCost.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}</span></p>
      </div>
      <div class="card-back">
        <h3>Layer 3: Hot Storage Info</h3>
        <p>This layer compares the data storage for frequently accessed data in <a href="https://aws.amazon.com/de/dynamodb/" target="_blank"><strong>AWS DynamoDB</strong></a> vs. <a href="https://azure.microsoft.com/de-de/products/cosmos-db" target="_blank"><strong>Azure CosmosDB</strong></a> considering possible transfer costs.</p>
      </div>
    </div>

        <!-- Layer 3 Cool Storage -->
    <div class="cost-card" onclick="flipCard(this)">
      <div class="card-front">
        <h3>Layer 3: Cool Storage <span class="info-icon">ℹ️</span></h3>
        <p><strong>AWS:</strong> <span class="total-cost">$${awsResultLayer3Cool.totalMonthlyCost.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}</span></p>
        <p><strong>Azure:</strong> <span class="total-cost">$${azureResultLayer3Cool.totalMonthlyCost.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}</span></p>
      </div>
      <div class="card-back">
        <h3>Layer 3: Cool Storage Info</h3>
        <p>This layer compares the data storage for inrequently accessed data in <a href="https://aws.amazon.com/de/s3/" target="_blank"><strong>AWS S3-Infrequent Access</strong></a> vs. <a href="https://azure.microsoft.com/en-us/products/storage/blobs" target="_blank"><strong>Azure BlobStorage (Cool Tier)</strong></a> considering possible transfer costs.</p>
      </div>
    </div>

            <!-- Layer 3 Archive Storage -->
    <div class="cost-card" onclick="flipCard(this)">
      <div class="card-front">
        <h3>Layer 3: Archive Storage <span class="info-icon">ℹ️</span></h3>
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
        <h3>Layer 3: Archive Storage Info</h3>
        <p>This layer compares the data storage for archived data in <a href="https://aws.amazon.com/de/s3/storage-classes/glacier/" target="_blank"><strong>Amazon S3-Glacier Deep Archive</strong></a> vs. <a href="https://azure.microsoft.com/en-us/products/storage/blobs" target="_blank"><strong>Azure Blob Storage (Archive Tier)</strong></a>.</p>
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
