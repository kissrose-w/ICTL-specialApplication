import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, Wallet, Heart, Image as ImageIcon, Sparkles } from 'lucide-react-native';

export const SpaceScreen: React.FC = () => {
  const modules = [
    {
      id: 'notes',
      title: '私密便签',
      desc: '两人的共享备忘录与心愿单',
      icon: FileText,
      color: '#f59e0b',
      bg: 'bg-amber-50',
    },
    {
      id: 'ledger',
      title: '共同账本',
      desc: 'AA记账与日常生活开销分摊',
      icon: Wallet,
      color: '#10b981',
      bg: 'bg-emerald-50',
    },
    {
      id: 'anniversary',
      title: '纪念日谱',
      desc: '记录每一个专属重要时刻',
      icon: Heart,
      color: '#f43f5e',
      bg: 'bg-rose-50',
    },
    {
      id: 'photos',
      title: '拍立得照片墙',
      desc: '只属于两人的相册胶卷',
      icon: ImageIcon,
      color: '#6366f1',
      bg: 'bg-indigo-50',
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View className="mb-5">
          <View className="flex-row items-center">
            <Sparkles size={20} color="#ec4899" />
            <Text className="text-xl font-black text-slate-800 ml-1.5">
              双人私密空间
            </Text>
          </View>
          <Text className="text-xs text-slate-500 mt-1">
            无第三方干扰 · 端到端私密数据存储
          </Text>
        </View>

        {/* Feature Grid */}
        <View className="flex-row flex-wrap justify-between">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <TouchableOpacity
                key={m.id}
                className="w-[48%] bg-white rounded-2xl p-4 mb-4 border border-slate-200 shadow-sm"
              >
                <View
                  className={`w-10 h-10 rounded-xl items-center justify-center mb-3 ${m.bg}`}
                >
                  <Icon size={20} color={m.color} />
                </View>
                <Text className="text-base font-bold text-slate-800 mb-1">
                  {m.title}
                </Text>
                <Text className="text-xs text-slate-400 leading-tight">
                  {m.desc}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
