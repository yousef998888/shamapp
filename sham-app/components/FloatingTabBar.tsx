import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

export function FloatingTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const colorScheme = useColorScheme();
  const tintColor = Colors[colorScheme ?? 'light'].tint;
  const { unreadCount, markAsRead } = useNotificationCount();
  
  // Mark notifications as read when inbox tab is active
  const isInboxActive = pathname === '/inbox' || pathname.startsWith('/inbox/');
  
  // Clear badge when inbox tab is focused/active
  useFocusEffect(
    useCallback(() => {
      if (isInboxActive && unreadCount > 0) {
        markAsRead();
      }
    }, [isInboxActive, unreadCount, markAsRead])
  );

  const tabs = [
    {
      name: 'Home',
      route: '/',
      icon: 'house',
      iconFilled: 'house.fill',
    },
    {
      name: 'Search',
      route: '/search',
      icon: 'magnifyingglass',
      iconFilled: 'magnifyingglass',
    },
    {
      name: 'Inbox',
      route: '/inbox',
      icon: 'bubble.left',
      iconFilled: 'bubble.left.fill',
    },
    {
      name: 'Account',
      route: '/explore/account',
      icon: 'person',
      iconFilled: 'person.fill',
    },
  ];

  const isActive = (route: string) => {
    if (route === '/') {
      return pathname === '/';
    }
    // For search route, also check if we're on search-results
    if (route === '/search') {
      const pathWithoutQuery = pathname.split('?')[0];
      return pathWithoutQuery === '/search' || pathWithoutQuery === '/search-results';
    }
    // Exact match (ignoring query params)
    const pathWithoutQuery = pathname.split('?')[0];
    return pathWithoutQuery === route;
  };

  return (
    <LinearGradient
    colors={[ 'rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
      style={styles.parentContainer}
    // style={styles.jumpBackSection}
    >
      {/* <Text style={styles.jumpBackText}>{t.jumpBackIn || 'Jump back in'}</Text> */}
      <View style={styles.container}
      >
        {tabs.map((tab) => {
          const active = isActive(tab.route);
          const showBadge = tab.route === '/inbox' && unreadCount > 0 && !isInboxActive;
          
          const handleTabPress = () => {
            if (tab.route === '/inbox' && unreadCount > 0) {
              // Mark as read immediately when clicking inbox tab
              markAsRead();
            }
            router.push(tab.route);
          };
          
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tab}
              onPress={handleTabPress}
            >
              <View style={styles.iconContainer}>
                <IconSymbol
                  size={active ? 24 : 20}
                  name={active ? tab.iconFilled : tab.icon}
                  color={active ? "#61d5b6" : '#666'}
                />
                {showBadge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </LinearGradient>

  );
}

const styles = StyleSheet.create({
  parentContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 90,
    alignItems: 'center',
  },
  container: {
    // position: 'absolute',
    top: 10,
    // left: '50%',
    // transform: [{ translateX: -80 }],
    height: 44,
    width: 200,
    backgroundColor: 'white',
    borderRadius: 25,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 1,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
});
