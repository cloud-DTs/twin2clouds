"use strict";

class PriorityQueue {
  constructor() {
    this.queue = [];
  }

  enqueue(node, cost) {
    this.queue.push({ node, cost });
    this.queue.sort((a, b) => a.cost - b.cost);
  }

  dequeue() {
    return this.queue.shift();
  }

  isEmpty() {
    return this.queue.length === 0;
  }
}

function buildGraphForStorage(
  awsHot,
  azureHot,
  awsCool,
  azureCool,
  awsArchive,
  azureArchive,
  transferCosts
) {
  let graph = {
    L3_AWS_Hot: {
      costs: awsHot.totalMonthlyCost,
      edges: {
        L3_AWS_Cool: transferCosts.L3_AWS_Hot_to_L3_AWS_Cool,
        L3_Azure_Cool: transferCosts.L3_AWS_Hot_to_L3_Azure_Cool,
      },
    },
    L3_Azure_Hot: {
      costs: azureHot.totalMonthlyCost,
      edges: {
        L3_AWS_Cool: transferCosts.L3_Azure_Hot_to_L3_AWS_Cool,
        L3_Azure_Cool: transferCosts.L3_Azure_Hot_to_L3_Azure_Cool,
      },
    },
    L3_AWS_Cool: {
      costs: awsCool.totalMonthlyCost,
      edges: {
        L3_AWS_Archive: transferCosts.L3_AWS_Cool_to_L3_AWS_Archive,
        L3_Azure_Archive: transferCosts.L3_AWS_Cool_to_L3_Azure_Archive,
      },
    },
    L3_Azure_Cool: {
      costs: azureCool.totalMonthlyCost,
      edges: {
        L3_AWS_Archive: transferCosts.L3_Azure_Cool_to_L3_AWS_Archive,
        L3_Azure_Archive: transferCosts.L3_Azure_Cool_to_L3_Azure_Archive,
      },
    },
    L3_AWS_Archive: {
      costs: awsArchive.totalMonthlyCost,
      edges: {},
    },
    L3_Azure_Archive: {
      costs: azureArchive.totalMonthlyCost,
      edges: {},
    },
  };
  return graph;
}

function findCheapestStoragePath(graph, startNodes, endNodes) {
  let costs = {};
  let parents = {};
  let pq = new PriorityQueue();

  // Initialize costs
  for (let node in graph) {
    costs[node] = Infinity;
  }

  // Start from both hot storage nodes
  for (let startNode of startNodes) {
    costs[startNode] = graph[startNode].costs;
    pq.enqueue(startNode, costs[startNode]);
  }

  while (!pq.isEmpty()) {
    let { node, cost } = pq.dequeue();

    if (cost > costs[node]) continue; // Ignore outdated paths

    if (!graph[node] || !graph[node].edges) continue; // Safety check

    for (let neighbor in graph[node].edges) {
      let edgeCost = graph[node].edges[neighbor] || 0;
      let newCost = cost + edgeCost + graph[neighbor].costs;

      if (newCost < costs[neighbor]) {
        costs[neighbor] = newCost;
        parents[neighbor] = node;
        pq.enqueue(neighbor, newCost);
      }
    }
  }

  // Find the cheapest path to any archive node
  let target = endNodes.reduce(
    (cheapest, node) => (costs[node] < costs[cheapest] ? node : cheapest),
    endNodes[0]
  );

  // Reconstruct the path
  let cheapestPath = [];
  let currentNode = target;
  while (currentNode) {
    cheapestPath.unshift(currentNode);
    currentNode = parents[currentNode];
  }

  return {
    path: cheapestPath,
    cost: costs[target],
  };
}
