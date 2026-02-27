"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChainMapHeader } from "./chain-map-header";
import { ChainVisualization } from "./chain-visualization";
import { ChainDetail } from "./chain-detail";
import { ChainLegend } from "./chain-legend";

import type { CrisisChainData, CategoryKey } from "@/lib/types";

interface CrisisChainMapProps {
  data: CrisisChainData;
}

export function CrisisChainMap({ data }: CrisisChainMapProps) {
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<CategoryKey | null>(null);

  const activeChainCount = data.chains.filter((c) => c.currentlyActive).length;
  const selectedChain = selectedChainId
    ? data.chains.find((c) => c.id === selectedChainId) ?? null
    : null;

  const handleNodeSelect = (nodeId: CategoryKey) => {
    setSelectedNodeId(nodeId);
    setSelectedChainId(null);
  };

  const handleChainSelect = (chainId: string | null) => {
    setSelectedChainId(chainId);
    setSelectedNodeId(null);
  };

  return (
    <Card className="py-4">
      <CardContent className="px-4">
        <ChainMapHeader activeChainCount={activeChainCount} />

        <ChainVisualization
          nodes={data.nodes}
          edges={data.edges}
          chains={data.chains}
          selectedChainId={selectedChainId}
          selectedNodeId={selectedNodeId}
          onChainSelect={handleChainSelect}
          onNodeSelect={handleNodeSelect}
        />

        <ChainDetail selectedChain={selectedChain} nodes={data.nodes} />

        <ChainLegend />
      </CardContent>
    </Card>
  );
}
