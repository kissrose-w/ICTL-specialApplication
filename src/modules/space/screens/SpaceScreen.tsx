import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, Wallet, Heart, Image as ImageIcon } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SpaceStackParamList } from '../../../types/navigation';

type Props = NativeStackScreenProps<SpaceStackParamList, 'SpaceHome'>;

export const SpaceScreen: React.FC<Props> = ({ navigation }) => {
  const modules = [
    {
      id: 'notes',
      title: '便签',
      desc: '想说的话、要买的东西，随手记下。',
      icon: FileText,
      enabled: true,
      action: () => navigation.navigate('NotesList'),
    },
    {
      id: 'ledger',
      title: '共同账本',
      desc: '把日常开销放在一处，不必再算。',
      icon: Wallet,
      enabled: false,
      action: () => Alert.alert('敬请期待', '账本还在筹备中。'),
    },
    {
      id: 'anniversary',
      title: '纪念日',
      desc: '把重要的日子，慢慢收进一条时间线。',
      icon: Heart,
      enabled: false,
      action: () => Alert.alert('敬请期待', '纪念日还在筹备中。'),
    },
    {
      id: 'photos',
      title: '照片墙',
      desc: '只留两个人的底片，不对外分享。',
      icon: ImageIcon,
      enabled: false,
      action: () => Alert.alert('敬请期待', '照片墙还在筹备中。'),
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top']}>
      <View className="px-[22px] flex-1">
        {/* 页头 */}
        <View className="pt-2">
          <Text className="text-[11px] text-muted tracking-[1px]">只属于你们的地方</Text>
          <View className="flex-row items-end justify-between mt-1">
            <Text
              className="text-[30px] text-ink leading-[34px]"
              style={{ fontFamily: 'serif', fontWeight: '600' }}
            >
              空间
            </Text>
            <View className="flex-row items-center pb-2">
              <View className="w-1.5 h-1.5 rounded-full bg-ida mr-1" />
              <View className="w-1.5 h-1.5 rounded-full bg-idb" />
            </View>
          </View>
        </View>

        {/* 四个抽屉 */}
        <View className="flex-row flex-wrap justify-between mt-[18px]">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <TouchableOpacity
                key={m.id}
                onPress={m.action}
                activeOpacity={0.7}
                className="w-[48%] bg-[#FBFAF6] border border-line rounded-2xl p-4 mb-3"
                style={{ minHeight: 142 }}
              >
                <View className="mb-[14px]">
                  <Icon size={22} color="#5C564C" strokeWidth={1.4} />
                </View>
                <Text className="text-[15.5px] font-semibold text-ink mb-[5px]">{m.title}</Text>
                <Text className="text-[11.5px] text-muted leading-[17px]">{m.desc}</Text>
                <Text className="mt-auto pt-3 text-[10px] tracking-[0.5px] text-[#B3ACA0]">
                  {m.enabled ? '共享' : '筹备中'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text className="text-[11px] text-[#A9A296] mt-3">所有内容仅你们两人可见。</Text>
      </View>
    </SafeAreaView>
  );
};
