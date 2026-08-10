"use client";

import { motion } from "framer-motion";
import { TrendingUp, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function HeroVisual() {
  return (
    <div className="relative h-[380px] w-full max-w-md shrink-0 sm:h-[420px]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute left-0 top-4 w-56"
      >
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Faturamento</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">R$ 42.850,90</p>
          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-success">
            <TrendingUp className="h-3.5 w-3.5" /> +12,4%
          </p>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="absolute right-0 top-24 w-52 sm:top-28"
      >
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Lucro</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">R$ 11.420,40</p>
          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-success">
            <TrendingUp className="h-3.5 w-3.5" /> +8,2%
          </p>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="absolute bottom-0 left-4 w-64 sm:left-8"
      >
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Target className="h-3.5 w-3.5" /> Meta mensal
            </p>
            <p className="text-xs font-semibold text-foreground">85,7%</p>
          </div>
          <Progress value={85.7} />
        </Card>
      </motion.div>
    </div>
  );
}
