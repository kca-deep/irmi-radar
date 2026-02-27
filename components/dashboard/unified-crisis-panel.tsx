"use client";

import { useState, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Share01Icon } from "@hugeicons/core-free-icons";
import { Card, CardContent } from "@/components/ui/card";
import { ChainVisualization } from "./chain-visualization";
import { ChainDetail } from "./chain-detail";
import { ChainLegend } from "./chain-legend";
import { SignalSidebar } from "./signal-sidebar";

import type {
  CrisisChainData,
  SignalPreview,
  SignalStats,
  CategoryKey,
} from "@/lib/types";

interface UnifiedCrisisPanelProps {
  crisisChain: CrisisChainData;
  signals: SignalPreview[];
  signalStats: SignalStats;
}

export function UnifiedCrisisPanel({
  crisisChain,
  signals,
  signalStats,
}: UnifiedCrisisPanelProps) {
  // Find highest risk category for default selection
  const highestRiskCategory = useMemo(() => {
    return crisisChain.nodes.reduce((max, node) =>
      node.score > max.score ? node : max
    ).id;
  }, [crisisChain.nodes]);

  const [selectedNodeId, setSelectedNodeId] = useState<CategoryKey | null>(
    highestRiskCategory
  );
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);

  // Get selected chain object
  const selectedChain = selectedChainId
    ? crisisChain.chains.find((c) => c.id === selectedChainId) ?? null
    : null;

  // Count active chains
  const activeChainCount = crisisChain.chains.filter(
    (c) => c.currentlyActive
  ).length;

  // Handle node selection
  const handleNodeSelect = (nodeId: CategoryKey) => {
    setSelectedNodeId(nodeId);
    setSelectedChainId(null); // Clear chain selection when node is selected
  };

  // Handle chain selection
  const handleChainSelect = (chainId: string | null) => {
    setSelectedChainId(chainId);
    if (chainId) {
      setSelectedNodeId(null); // Clear node selection when chain is selected
    } else {
      // If chain is deselected, go back to highest risk category
      setSelectedNodeId(highestRiskCategory);
    }
  };

  // Filter signals based on selection
  const filteredSignals = useMemo(() => {
    if (selectedChainId && selectedChain) {
      // Filter by all categories in chain path
      const pathCategories = new Set(selectedChain.path);
      return signals.filter((s) => pathCategories.has(s.category));
    }
    if (selectedNodeId) {
      // Filter by selected category
      return signals.filter((s) => s.category === selectedNodeId);
    }
    // Default: show all signals
    return signals;
  }, [signals, selectedNodeId, selectedChainId, selectedChain]);

  return (
    <Card className="py-4">
      <CardContent className="px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              icon={Share01Icon}
              size={18}
              strokeWidth={2}
              className="text-primary"
            />
            <h3 className="text-sm font-semibold text-foreground">
              위기 연쇄 현황
            </h3>
          </div>
          {activeChainCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-danger/10 text-danger font-medium">
              {activeChainCount}개 연쇄 반응 감지
            </span>
          )}
        </div>

        {/* Main content: Map + Sidebar */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Left: Chain visualization */}
          <div className="md:col-span-3">
            <ChainVisualization
              nodes={crisisChain.nodes}
              edges={crisisChain.edges}
              chains={crisisChain.chains}
              selectedChainId={selectedChainId}
              selectedNodeId={selectedNodeId}
              onChainSelect={handleChainSelect}
              onNodeSelect={handleNodeSelect}
            />

            {/* Chain detail (when chain is selected) */}
            <ChainDetail
              selectedChain={selectedChain}
              nodes={crisisChain.nodes}
            />
          </div>

          {/* Right: Signal sidebar */}
          <div className="md:col-span-2 min-h-[200px]">
            <SignalSidebar
              signals={filteredSignals}
              stats={signalStats}
              selectedCategory={selectedNodeId}
              selectedChainName={selectedChain?.name ?? null}
            />
          </div>
        </div>

        {/* Legend */}
        <ChainLegend />
      </CardContent>
    </Card>
  );
}
