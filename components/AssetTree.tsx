import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { WealthItem } from '../types';
import { getCurrencySymbol } from '../constants';

interface AssetTreeProps {
  wealthItems: WealthItem[];
  currency: string;
}

const AssetTree: React.FC<AssetTreeProps> = ({ wealthItems, currency }) => {
  const symbol = getCurrencySymbol(currency);
  
  // User specifically asked for 10 lakhs as 1M
  const formatValueStrict = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${Math.round(val / 1000)}K`;
    return val.toString();
  };

  const assetData = useMemo(() => {
    const assets = wealthItems.filter(i => i.type === 'Investment');
    const categories: Record<string, number> = {};
    assets.forEach(a => {
      categories[a.category] = (categories[a.category] || 0) + a.value;
    });
    
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [wealthItems]);

  const totalValue = assetData.reduce((sum, d) => sum + d.value, 0);

  // Tree dimensions
  const width = 400;
  const height = 400;

  // Branch generation logic
  const branches = useMemo(() => {
    return assetData.map((data, index) => {
      // Distribute branches around the top half of the tree
      const angleRange = Math.PI * 1.2;
      const startAngle = -Math.PI * 1.1;
      const angle = startAngle + (index / (assetData.length - 1 || 1)) * angleRange;
      
      const length = 80 + ((index * 23) % 60);
      const targetX = 200 + Math.cos(angle) * length;
      const targetY = 160 + Math.sin(angle) * length;
      
      // Mango size proportional to value
      const size = Math.max(30, (data.value / (totalValue || 1)) * 90);
      
      return {
        ...data,
        angle,
        targetX,
        targetY,
        size
      };
    });
  }, [assetData, totalValue]);

  return (
    <div className="w-full h-full relative overflow-hidden flex items-center justify-center bg-white dark:bg-slate-900/20 rounded-3xl">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full max-w-[500px]">
        <defs>
          <linearGradient id="trunkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4E342E" />
            <stop offset="50%" stopColor="#6D4C41" />
            <stop offset="100%" stopColor="#3E2723" />
          </linearGradient>
          <linearGradient id="mangoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFEB3B" />
            <stop offset="60%" stopColor="#FFC107" />
            <stop offset="100%" stopColor="#FF9800" />
          </linearGradient>
          <linearGradient id="leafGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#43A047" />
            <stop offset="100%" stopColor="#1B5E20" />
          </linearGradient>
          <filter id="fruitShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
            <feOffset dx="1" dy="2" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Canopy Background (Bushy foliage) */}
        <g opacity="0.9">
          {[...Array(15)].map((_, i) => {
            const angle = (i / 15) * Math.PI * 2;
            const dist = 30 + ((i * 19) % 60);
            const cx = 200 + Math.cos(angle) * dist;
            const cy = 150 + Math.sin(angle) * dist;
            const r = 55 + ((i * 9) % 35);
            return (
              <motion.circle
                key={`foliage-${i}`}
                cx={cx}
                cy={cy}
                r={r}
                fill="url(#leafGradient)"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 + i * 0.04, type: 'spring' }}
              />
            );
          })}
        </g>

        {/* Tree Trunk (Thicker) */}
        <motion.path
          d="M185,400 Q200,380 200,250 L200,150"
          stroke="url(#trunkGradient)"
          strokeWidth="24"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        
        {/* Bark Texture Lines */}
        <motion.path
          d="M195,380 Q205,300 205,200"
          stroke="rgba(0,0,0,0.1)"
          strokeWidth="2"
          fill="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        />

        {/* Grass at bottom */}
        <g transform="translate(100, 380)">
          {[...Array(15)].map((_, i) => (
            <motion.path
              key={`grass-${i}`}
              d={`M${i * 15},20 L${i * 15 + 5},0 L${i * 15 + 10},20 Z`}
              fill="#2E7D32"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 1.5 + i * 0.05 }}
            />
          ))}
        </g>

        {/* Branches and Fruits */}
        {branches.map((branch, index) => (
          <g key={branch.name}>
            {/* Branch */}
            <motion.path
              d={`M200,150 Q${200 + Math.cos(branch.angle) * 40},${150 + Math.sin(branch.angle) * 40} ${branch.targetX},${branch.targetY}`}
              stroke="#4E342E"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: 0.5 + index * 0.1 }}
            />
            
            {/* Mango Fruit Group */}
            <motion.g
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                type: 'spring', 
                stiffness: 100, 
                damping: 10,
                delay: 1.2 + index * 0.1 
              }}
              style={{ originX: `${branch.targetX}px`, originY: `${branch.targetY}px` }}
            >
              {/* Swaying animation group */}
              <motion.g
                animate={{ rotate: [0, 2, -2, 0] }}
                transition={{ 
                  duration: 4 + ((index * 7) % 3), 
                  repeat: Infinity, 
                  ease: "easeInOut",
                  delay: index * 0.2
                }}
                style={{ originX: `${branch.targetX}px`, originY: `${branch.targetY}px` }}
              >
                {/* Stem (Longer) */}
                <path 
                  d={`M${branch.targetX},${branch.targetY} Q${branch.targetX + 5},${branch.targetY + 10} ${branch.targetX},${branch.targetY + 20}`}
                  stroke="#4E342E" strokeWidth="2" fill="none"
                />

                {/* Leaves on Fruit Stem */}
                <path
                  d={`M${branch.targetX},${branch.targetY + 10} c-10,-5 -15,5 -5,10 c5,-5 15,-10 5,-10 Z`}
                  fill="#2E7D32"
                  transform={`rotate(${(index * 45) % 360}, ${branch.targetX}, ${branch.targetY + 10})`}
                />
                
                {/* Mango Shape (Editorial Style) */}
                <path
                  d={`M${branch.targetX},${branch.targetY + 20} 
                     c-8,-2 -20,8 -20,25 
                     c0,18 12,30 25,30 
                     c12,0 20,-12 20,-25 
                     c0,-12 -8,-18 -15,-18 
                     c-5,0 -5,-5 -10,-12 Z`}
                  fill="url(#mangoGradient)"
                  filter="url(#fruitShadow)"
                  transform={`scale(${branch.size / 50}) translate(${(branch.targetX * (1 - branch.size / 50)) / (branch.size / 50)}, ${(branch.targetY * (1 - branch.size / 50)) / (branch.size / 50)})`}
                />
                
                {/* Value Text (High Contrast) */}
                <g transform={`translate(0, ${branch.size * 0.15})`}>
                  <text
                    x={branch.targetX}
                    y={branch.targetY + 42}
                    textAnchor="middle"
                    className="text-[10px] font-black fill-slate-900 uppercase tracking-tighter pointer-events-none"
                    style={{ fontSize: `${Math.max(7, branch.size / 6)}px` }}
                  >
                    {branch.name}
                  </text>
                  <text
                    x={branch.targetX}
                    y={branch.targetY + 54}
                    textAnchor="middle"
                    className="text-[8px] font-black fill-slate-800 pointer-events-none"
                    style={{ fontSize: `${Math.max(6, branch.size / 7.5)}px` }}
                  >
                    {symbol}{formatValueStrict(branch.value)}
                  </text>
                </g>
              </motion.g>
            </motion.g>
          </g>
        ))}
      </svg>
      
      {/* Legend / Info */}
      <div className="absolute bottom-4 right-6 text-right">
        <p className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">Asset Orchard</p>
        <p className="text-[6px] font-bold text-slate-400 uppercase tracking-widest mt-1 leading-none">Fruit size = Relative Value</p>
      </div>
    </div>
  );
};

export default AssetTree;
