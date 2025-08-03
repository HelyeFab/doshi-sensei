'use client';

import { UserShareStats } from '@/types/sharing';
import { useStrings } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { 
  ChartBarIcon, 
  UserGroupIcon, 
  FireIcon 
} from '@heroicons/react/24/outline';

interface ShareStatsProps {
  stats: UserShareStats;
}

export function ShareStats({ stats }: ShareStatsProps) {
  const strings = useStrings();
  
  const statItems = [
    {
      icon: ChartBarIcon,
      label: strings.share?.stats?.totalShares || 'Total Shares',
      value: stats.totalShares,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      icon: UserGroupIcon,
      label: strings.share?.stats?.friendsJoined || 'Friends Joined',
      value: stats.totalConversions,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      icon: FireIcon,
      label: strings.share?.stats?.conversionRate || 'Success Rate',
      value: `${Math.round(stats.conversionRate * 100)}%`,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  const topPlatform = Object.entries(stats.sharesByMethod)
    .sort(([, a], [, b]) => b - a)[0];

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {statItems.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-50 rounded-lg p-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={`p-1.5 rounded-lg ${item.bgColor}`}>
                <item.icon className={`w-4 h-4 ${item.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {item.value}
            </div>
            <div className="text-xs text-gray-600">
              {item.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Platform Breakdown */}
      {Object.keys(stats.sharesByMethod).length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 mb-3">
            {strings.share?.stats?.byPlatform || 'Shares by Platform'}
          </h5>
          <div className="space-y-2">
            {Object.entries(stats.sharesByMethod)
              .sort(([, a], [, b]) => b - a)
              .map(([method, count]) => {
                const percentage = stats.totalShares > 0 
                  ? Math.round((count / stats.totalShares) * 100)
                  : 0;
                
                return (
                  <div key={method} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium capitalize">
                          {method}
                        </span>
                        <span className="text-sm text-gray-600">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                          className="bg-primary-600 h-2 rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Achievement Callout */}
      {stats.totalConversions >= 5 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg p-4"
        >
          <div className="flex items-center gap-3">
            <div className="text-3xl">🏆</div>
            <div>
              <h5 className="font-bold">
                {strings.share?.stats?.achievement || 'Super Referrer!'}
              </h5>
              <p className="text-sm opacity-90">
                {strings.share?.stats?.achievementDesc || 
                  `You've helped ${stats.totalConversions} friends start their Japanese journey!`}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tips */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h5 className="font-medium text-blue-900 mb-2">
          {strings.share?.stats?.tips || 'Sharing Tips'}
        </h5>
        <ul className="text-sm text-blue-700 space-y-1">
          {topPlatform && (
            <li>
              • {strings.share?.stats?.topPlatformTip || 
                `${topPlatform[0]} is your most successful platform!`}
            </li>
          )}
          <li>
            • {strings.share?.stats?.tip1 || 
              'Share when you achieve milestones for better engagement'}
          </li>
          <li>
            • {strings.share?.stats?.tip2 || 
              'Personal messages convert 3x better than generic shares'}
          </li>
        </ul>
      </div>
    </div>
  );
}