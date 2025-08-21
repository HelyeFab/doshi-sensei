'use client';

interface FeatureMatrixStatsProps {
  stats: {
    totalFeatures: number;
    activeFeatures: number;
    plannedFeatures: number;
    guestAccessible: number;
    freeAccessible: number;
    premiumExclusive: number;
  };
}

export function FeatureMatrixStats({ stats }: FeatureMatrixStatsProps) {
  const statCards = [
    {
      label: 'Total Features',
      value: stats.totalFeatures,
      icon: '📊',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    },
    {
      label: 'Active Features',
      value: stats.activeFeatures,
      icon: '✅',
      color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    },
    {
      label: 'Planned Features',
      value: stats.plannedFeatures,
      icon: '🚧',
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
    },
    {
      label: 'Guest Access',
      value: stats.guestAccessible,
      icon: '👤',
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    },
    {
      label: 'Free Access',
      value: stats.freeAccessible,
      icon: '🆓',
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
    },
    {
      label: 'Premium Only',
      value: stats.premiumExclusive,
      icon: '⭐',
      color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
    }
  ];
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-4 mb-8 sm:mb-10">
      {statCards.map((stat) => (
        <div
          key={stat.label}
          className="bg-card border rounded-lg p-4 sm:p-5 text-center"
        >
          <div className="text-xl sm:text-2xl mb-1 sm:mb-2">{stat.icon}</div>
          <div className="text-xl sm:text-2xl font-bold mb-1">{stat.value}</div>
          <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}