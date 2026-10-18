import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

const COLORS = {
  background: '#f6f5ef',
  paper: '#fffefb',
  ink: '#222923',
  muted: '#84877f',
  line: '#e6e5dc',
  green: '#385d4b',
  lightGreen: '#e7eee6',
  orange: '#c65d36',
  lightOrange: '#f5e9e2',
  error: '#aa4334',
};

const STORAGE = {
  profile: '@daily-signal/profile',
  favorites: '@daily-signal/favorites',
  settings: '@daily-signal/settings',
};

const DEFAULT_SETTINGS = { dailyBriefing: false, compactCards: false, displayName: '' };
const FILTERS = ['For you', 'AI', 'Startups', 'Science'];

function Brand({ small = false }) {
  return (
    <View style={styles.brand}>
      <View style={[styles.brandMark, small && styles.brandMarkSmall]}>
        <View style={styles.brandMarkBar} />
        <View style={[styles.brandMarkBar, styles.brandMarkBarShort]} />
        <View style={styles.brandMarkDot} />
      </View>
      <Text style={[styles.brandName, small && styles.brandNameSmall]}>signal<Text style={styles.brandPeriod}>.</Text></Text>
    </View>
  );
}

function IconButton({ name, onPress, accessibilityLabel, selected = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, selected && styles.iconButtonSelected, pressed && styles.pressed]}
    >
      <MaterialCommunityIcons name={name} size={21} color={selected ? COLORS.orange : COLORS.ink} />
    </Pressable>
  );
}

function PageHeading({ eyebrow, title }) {
  return (
    <View style={styles.pageHeading}>
      <View>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.pageTitle}>{title}</Text>
      </View>
    </View>
  );
}

function ActionButton({ title, onPress, busy }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
    >
      {busy ? <ActivityIndicator color={COLORS.paper} /> : <Text style={styles.actionButtonText}>{title}</Text>}
    </Pressable>
  );
}

function TextField({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize = 'none' }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#a3a59d"
        returnKeyType="next"
        secureTextEntry={secureTextEntry}
        style={styles.fieldInput}
        value={value}
      />
    </View>
  );
}

function EmptyState({ icon = 'text-search', title, detail, action, onAction }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}><MaterialCommunityIcons name={icon} size={27} color={COLORS.green} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDetail}>{detail}</Text>
      {action ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.textAction}>
          <Text style={styles.textActionLabel}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function formatAge(timestamp) {
  if (!timestamp) return 'Recently';
  const hours = Math.max(1, Math.floor((Date.now() - timestamp * 1000) / 3600000));
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

function getCategory(story) {
  const title = (story.title || '').toLowerCase();
  if (/\b(ai|artificial intelligence|llm|machine learning|openai|neural)\b/.test(title)) return 'AI & Research';
  if (/\b(space|nasa|climate|biology|physics|science|energy)\b/.test(title)) return 'Science';
  if (/\b(startup|founder|funding|venture capital)\b/.test(title)) return 'Startups';
  if (/\b(design|culture|film|music|books)\b/.test(title)) return 'Culture';
  return 'Technology';
}

function adaptStory(hit) {
  return {
    id: String(hit.objectID),
    title: hit.title || hit.story_title || 'Untitled story',
    url: hit.url || hit.story_url || '',
    author: hit.author || 'Unknown author',
    points: hit.points || 0,
    comments: hit.num_comments || 0,
    createdAt: hit.created_at_i || Math.floor(Date.now() / 1000),
    text: hit.story_text || '',
    category: getCategory(hit),
  };
}

function StoryCard({ story, saved, onOpen, onToggleSave, compact = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Read story: ${story.title}`}
      onPress={() => onOpen(story)}
      style={({ pressed }) => [styles.storyCard, compact && styles.storyCardCompact, pressed && styles.storyCardPressed]}
    >
      <View style={styles.storyMeta}>
        <Text style={styles.storyCategory}>{story.category}</Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.storyAge}>{formatAge(story.createdAt)}</Text>
      </View>
      <Text numberOfLines={compact ? 2 : 3} style={styles.storyTitle}>{story.title}</Text>
      <View style={styles.storyFooter}>
        <View style={styles.storyStats}>
          <MaterialCommunityIcons name="arrow-up-bold-outline" size={15} color={COLORS.muted} />
          <Text style={styles.storyStat}>{story.points}</Text>
          <MaterialCommunityIcons name="comment-outline" size={14} color={COLORS.muted} />
          <Text style={styles.storyStat}>{story.comments}</Text>
          <Text style={styles.storyAuthor}>by {story.author}</Text>
        </View>
        <View style={styles.storyActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Remove from saved stories' : 'Save story'}
            hitSlop={10}
            onPress={(event) => {
              event.stopPropagation();
              onToggleSave(story);
            }}
            style={styles.saveButton}
          >
            <MaterialCommunityIcons name={saved ? 'bookmark' : 'bookmark-outline'} size={19} color={saved ? COLORS.orange : COLORS.muted} />
          </Pressable>
          <MaterialCommunityIcons name="arrow-top-right" size={18} color={COLORS.green} />
        </View>
      </View>
    </Pressable>
  );
}

function TabBar({ active, onNavigate }) {
  const tabs = [
    { key: 'home', title: 'Today', icon: 'view-agenda-outline' },
    { key: 'saved', title: 'Saved', icon: 'bookmark-outline' },
    { key: 'profile', title: 'You', icon: 'account-circle-outline' },
  ];
  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            key={tab.key}
            onPress={() => onNavigate(tab.key)}
            style={styles.tabItem}
          >
            <MaterialCommunityIcons name={isActive && tab.key === 'saved' ? 'bookmark' : tab.icon} size={22} color={isActive ? COLORS.green : COLORS.muted} />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.title}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TopBar({ onBack, right }) {
  return (
    <View style={styles.topBar}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} style={styles.backButton}>
        <MaterialCommunityIcons name="arrow-left" size={21} color={COLORS.ink} />
      </Pressable>
      <Brand small />
      {right || <View style={styles.topBarSpacer} />}
    </View>
  );
}

function SettingsToggle({ icon, title, subtitle, value, onChange }) {
  return (
    <View style={styles.settingsActionRow}>
      <View style={styles.settingsRowIcon}><MaterialCommunityIcons name={icon} size={19} color={COLORS.green} /></View>
      <View style={styles.settingsRowBody}><Text style={styles.settingsRowTitle}>{title}</Text><Text style={styles.settingsRowHint}>{subtitle}</Text></View>
      <Switch
        accessibilityLabel={title}
        onValueChange={onChange}
        trackColor={{ false: COLORS.line, true: COLORS.green }}
        thumbColor={COLORS.paper}
        value={value}
      />
    </View>
  );
}

function ProfileAction({ icon, title, detail, onPress }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.settingsActionRow}>
      <View style={styles.settingsRowIcon}><MaterialCommunityIcons name={icon} size={19} color={COLORS.green} /></View>
      <View style={styles.settingsRowBody}><Text style={styles.settingsRowTitle}>{title}</Text><Text style={styles.settingsRowHint}>{detail}</Text></View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.muted} />
    </Pressable>
  );
}

export default function App() {
  const [profile, setProfile] = useState(null);
  const [screen, setScreen] = useState('login');
  const [previousScreen, setPreviousScreen] = useState('home');
  const [stories, setStories] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [selectedStory, setSelectedStory] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('For you');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [formError, setFormError] = useState('');
  const [feedError, setFeedError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [booting, setBooting] = useState(true);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let mounted = true;
    async function restore() {
      try {
        const [storedProfile, storedFavorites, storedSettings] = await Promise.all([
          AsyncStorage.getItem(STORAGE.profile),
          AsyncStorage.getItem(STORAGE.favorites),
          AsyncStorage.getItem(STORAGE.settings),
        ]);
        if (!mounted) return;
        const savedProfile = storedProfile ? JSON.parse(storedProfile) : null;
        setProfile(savedProfile);
        setFavorites(storedFavorites ? JSON.parse(storedFavorites) : []);
        setSettings({ ...DEFAULT_SETTINGS, ...(storedSettings ? JSON.parse(storedSettings) : {}) });
        if (savedProfile) setScreen('home');
      } catch {
        setNotice('Some saved preferences could not be restored. You can continue using Signal.');
      } finally {
        if (mounted) setBooting(false);
      }
    }
    restore();
    return () => { mounted = false; };
  }, []);

  const loadStories = useCallback(async () => {
    setLoadingFeed(true);
    setFeedError('');
    try {
      const response = await fetch('https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=30');
      if (!response.ok) throw new Error('News service unavailable');
      const result = await response.json();
      setStories((result.hits || []).map(adaptStory));
    } catch {
      setFeedError('We couldn’t reach the news desk. Check your connection and try again.');
    } finally {
      setLoadingFeed(false);
    }
  }, []);

  useEffect(() => {
    if (!booting && profile) loadStories();
  }, [booting, profile, loadStories]);

  async function submitAuth() {
    setFormError('');
    const email = form.email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setFormError('Enter a valid email address to continue.');
      return;
    }
    if (form.password.length < 6) {
      setFormError('Your password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      const stored = await AsyncStorage.getItem(STORAGE.profile);
      const savedProfile = stored ? JSON.parse(stored) : null;
      if (screen === 'signup') {
        if (!form.name.trim()) {
          setFormError('Add your name to create a profile.');
          return;
        }
        if (savedProfile && savedProfile.email === email) {
          setFormError('An account with this email already exists on this device. Sign in instead.');
          return;
        }
        const newProfile = { name: form.name.trim(), email, password: form.password };
        await AsyncStorage.setItem(STORAGE.profile, JSON.stringify(newProfile));
        setProfile(newProfile);
        setNotice('Demo profile created on this device. No external account service is connected.');
      } else {
        if (!savedProfile || savedProfile.email !== email || savedProfile.password !== form.password) {
          setFormError('Email or password not recognized. Create a demo profile on this device first.');
          return;
        }
        setProfile(savedProfile);
      }
      setForm({ name: '', email: '', password: '' });
      setScreen('home');
    } catch {
      setFormError('We couldn’t save your profile on this device. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleFavorite(story) {
    const exists = favorites.some((saved) => saved.id === story.id);
    const updated = exists ? favorites.filter((saved) => saved.id !== story.id) : [story, ...favorites];
    setFavorites(updated);
    try {
      await AsyncStorage.setItem(STORAGE.favorites, JSON.stringify(updated));
    } catch {
      setNotice('The change could not be saved to device storage.');
    }
  }

  async function updateSettings(next) {
    const updated = { ...settings, ...next };
    setSettings(updated);
    try {
      await AsyncStorage.setItem(STORAGE.settings, JSON.stringify(updated));
    } catch {
      setNotice('The preference could not be saved on this device.');
    }
  }

  function openSettings() {
    setMenuOpen(false);
    setPreviousScreen(screen === 'detail' ? 'home' : screen);
    setScreen('settings');
  }

  async function toggleReminder(enabled) {
    if (!enabled) {
      await updateSettings({ dailyBriefing: false });
      return;
    }
    try {
      if (Platform.OS === 'web') {
        if (typeof window === 'undefined' || !('Notification' in window)) {
          setNotice('Notifications are not supported in this browser.');
          return;
        }
        const permission = await window.Notification.requestPermission();
        if (permission !== 'granted') {
          setNotice('Allow browser notifications to turn on your daily briefing.');
          return;
        }
      } else {
        const permission = await Notifications.requestPermissionsAsync();
        if (!permission.granted) {
          setNotice('Allow notifications in device settings to turn on your briefing.');
          return;
        }
      }
      await updateSettings({ dailyBriefing: true });
      setNotice('Daily briefing is enabled on this device.');
    } catch {
      setNotice('Notification permission could not be requested. Check your device settings.');
    }
  }

  async function sendTestNotification() {
    try {
      if (Platform.OS === 'web') {
        if (typeof window === 'undefined' || !('Notification' in window)) {
          setNotice('Notifications are not supported in this browser.');
          return;
        }
        let permission = window.Notification.permission;
        if (permission === 'default') permission = await window.Notification.requestPermission();
        if (permission !== 'granted') {
          setNotice('Allow browser notifications to receive a test briefing.');
          return;
        }
        new window.Notification('Your Signal briefing is ready', { body: 'A fresh batch of stories is waiting in Today.' });
      } else {
        const permission = await Notifications.requestPermissionsAsync();
        if (!permission.granted) {
          setNotice('Allow notifications in device settings before sending a test.');
          return;
        }
        await Notifications.scheduleNotificationAsync({
          content: { title: 'Your Signal briefing is ready', body: 'A fresh batch of stories is waiting in Today.', sound: true },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 },
        });
      }
      setNotice('Test notification sent.');
    } catch {
      setNotice('The test notification could not be delivered. Check notification permission.');
    }
  }

  async function signOut() {
    setProfile(null);
    setFormError('');
    setScreen('login');
    try {
      await AsyncStorage.removeItem(STORAGE.profile);
    } catch {
      setNotice('Sign-out could not clear the local demo profile.');
    }
  }

  function navigateTo(key) {
    setScreen(key);
    setMenuOpen(false);
    setSearchOpen(false);
    setSearch('');
  }

  const visibleStories = stories.filter((story) => {
    const query = search.trim().toLowerCase();
    const matchesQuery = !query || `${story.title} ${story.author} ${story.category}`.toLowerCase().includes(query);
    const matchesFilter = filter === 'For you'
      || (filter === 'AI' && story.category === 'AI & Research')
      || (filter === 'Startups' && story.category === 'Startups')
      || (filter === 'Science' && story.category === 'Science');
    return matchesQuery && matchesFilter;
  });

  function openStory(story) {
    setSelectedStory(story);
    setPreviousScreen(screen);
    setScreen('detail');
  }

  if (booting) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar style="dark" />
        <Brand />
        <ActivityIndicator color={COLORS.green} style={styles.bootSpinner} />
      </SafeAreaView>
    );
  }

  if (!profile && (screen === 'login' || screen === 'signup')) {
    const isSignup = screen === 'signup';
    return (
      <SafeAreaView style={styles.authScreen}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.authKeyboard}>
          <ScrollView contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled">
            <View style={styles.authTop}><Brand /><Text style={styles.authEdition}>A CLEARER VIEW OF WHAT MATTERS</Text></View>
            <View style={styles.authBody}>
              <View style={styles.authAccent}><View style={styles.authAccentLine} /></View>
              <Text style={styles.authKicker}>{isSignup ? 'A BETTER BRIEFING STARTS HERE' : 'YOUR DAILY EDITION'}</Text>
              <Text style={styles.authTitle}>{isSignup ? 'Make room for\na little perspective.' : 'Good stories.\nNo extra noise.'}</Text>
              <Text style={styles.authDescription}>
                {isSignup ? 'Save the stories you love. Your reading space stays right here on your device.' : 'A thoughtful daily read, shaped around what you care about.'}
              </Text>
              {isSignup ? <TextField autoCapitalize="words" label="Username" onChangeText={(value) => setForm({ ...form, name: value })} placeholder="Ada Lovelace" value={form.name} /> : null}
              <TextField keyboardType="email-address" label="Email address" onChangeText={(value) => setForm({ ...form, email: value })} placeholder="you@example.com" value={form.email} />
              <TextField label="Password" onChangeText={(value) => setForm({ ...form, password: value })} placeholder="At least 6 characters" secureTextEntry value={form.password} />
              {formError ? <View accessibilityRole="alert" style={styles.formError}><MaterialCommunityIcons name="alert-circle-outline" size={17} color={COLORS.error} /><Text style={styles.formErrorText}>{formError}</Text></View> : null}
              <ActionButton busy={busy} onPress={submitAuth} title={isSignup ? 'Sign up' : 'Log in'} />
              <View style={styles.authSwitch}>
                <Text style={styles.authSwitchText}>{isSignup ? 'Already have an account?' : 'New to Signal?'}</Text>
                <Pressable onPress={() => { setFormError(''); setScreen(isSignup ? 'login' : 'signup'); }}>
                  <Text style={styles.authSwitchAction}>{isSignup ? ' Log in' : ' Sign up'}</Text>
                </Pressable>
              </View>
              <Text style={styles.authFootnote}>DEMO ACCOUNTS ARE SAVED ON THIS DEVICE ONLY</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (screen === 'detail' && selectedStory) {
    const isSaved = favorites.some((story) => story.id === selectedStory.id);
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <TopBar onBack={() => setScreen(previousScreen === 'detail' ? 'home' : previousScreen)} right={<IconButton accessibilityLabel={isSaved ? 'Remove saved story' : 'Save story'} name={isSaved ? 'bookmark' : 'bookmark-outline'} onPress={() => toggleFavorite(selectedStory)} selected={isSaved} />} />
        <ScrollView contentContainerStyle={styles.detailContent}>
          <View style={styles.detailHero}>
            <Text style={styles.detailEyebrow}>{selectedStory.category.toUpperCase()}  /  {formatAge(selectedStory.createdAt).toUpperCase()}</Text>
            <Text style={styles.detailTitle}>{selectedStory.title}</Text>
            <View style={styles.detailByline}>
              <View style={styles.authorAvatar}><Text style={styles.authorInitial}>{selectedStory.author.slice(0, 1).toUpperCase()}</Text></View>
              <View><Text style={styles.authorName}>{selectedStory.author}</Text><Text style={styles.authorCaption}>Signal story source</Text></View>
            </View>
          </View>
          <View style={styles.detailStats}>
            <View><Text style={styles.detailStatNumber}>{selectedStory.points}</Text><Text style={styles.detailStatLabel}>POINTS</Text></View>
            <View style={styles.detailStatRule} />
            <View><Text style={styles.detailStatNumber}>{selectedStory.comments}</Text><Text style={styles.detailStatLabel}>COMMENTS</Text></View>
            <View style={styles.detailStatRule} />
            <View><Text style={styles.detailStatNumber}>{formatAge(selectedStory.createdAt)}</Text><Text style={styles.detailStatLabel}>PUBLISHED</Text></View>
          </View>
          {selectedStory.text ? <Text style={styles.detailBody}>{selectedStory.text.replace(/<[^>]*>/g, '')}</Text> : (
            <View style={styles.sourceNote}><MaterialCommunityIcons name="information-outline" size={20} color={COLORS.green} /><Text style={styles.sourceNoteText}>The original story is hosted by its publisher. Follow the link below to read the complete article.</Text></View>
          )}
          {selectedStory.url ? <ActionButton onPress={() => Linking.openURL(selectedStory.url)} title="Read the original story  ↗" /> : null}
          <Text style={styles.sourceCaption}>SOURCE  ·  HACKER NEWS</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'notifications') {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <TopBar onBack={() => setScreen(previousScreen)} />
        <ScrollView contentContainerStyle={styles.settingsContent}>
          <PageHeading eyebrow="A MOMENT, WHEN IT MATTERS" title="Notifications" />
          <Text style={styles.notificationIntro}>Choose whether Signal can send a daily briefing to this device. You can change this any time.</Text>
          <Text style={styles.sectionLabel}>DAILY BRIEFING</Text>
          <View style={styles.settingsGroup}>
            <SettingsToggle icon="bell-outline" title="Daily briefing" subtitle="A gentle nudge when new stories arrive" value={settings.dailyBriefing} onChange={toggleReminder} />
          </View>
          <Text style={styles.sectionLabel}>TEST DELIVERY</Text>
          <View style={styles.settingsGroup}>
            <Pressable accessibilityRole="button" onPress={sendTestNotification} style={styles.settingsActionRow}>
              <View style={styles.settingsRowIcon}><MaterialCommunityIcons name="send-outline" size={18} color={COLORS.green} /></View>
              <View style={styles.settingsRowBody}><Text style={styles.settingsRowTitle}>Send a test notification</Text><Text style={styles.settingsRowHint}>Check that alerts reach this device</Text></View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.muted} />
            </Pressable>
          </View>
          <Text style={styles.notificationFootnote}>A test alert is delivered by your browser or device after you grant notification permission.</Text>
          {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'settings') {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <TopBar onBack={() => setScreen(previousScreen)} />
        <ScrollView contentContainerStyle={styles.settingsContent}>
          <PageHeading eyebrow="YOUR READING SPACE" title="Settings" />
          <Text style={styles.sectionLabel}>PROFILE</Text>
          <View style={styles.settingsGroup}>
            <View style={styles.settingsRow}>
              <View style={styles.settingsRowIcon}><MaterialCommunityIcons name="account-outline" size={19} color={COLORS.green} /></View>
              <View style={styles.settingsRowBody}><Text style={styles.settingsRowTitle}>Display name</Text><Text style={styles.settingsRowHint}>{settings.displayName || profile?.name || profile?.email}</Text></View>
            </View>
            <TextInput
              accessibilityLabel="Display name"
              onChangeText={(value) => updateSettings({ displayName: value })}
              placeholder="Your display name"
              placeholderTextColor="#a3a59d"
              style={styles.settingsNameInput}
              value={settings.displayName}
            />
          </View>
          <Text style={styles.sectionLabel}>READING</Text>
          <View style={styles.settingsGroup}>
            <SettingsToggle icon="view-agenda-outline" title="Compact story cards" subtitle="Fit more headlines on screen" value={settings.compactCards} onChange={(value) => updateSettings({ compactCards: value })} />
          </View>
          <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
          <View style={styles.settingsGroup}>
            <Pressable accessibilityRole="button" onPress={() => { setPreviousScreen('settings'); setScreen('notifications'); }} style={styles.settingsActionRow}>
              <View style={styles.settingsRowIcon}><MaterialCommunityIcons name="bell-outline" size={19} color={COLORS.green} /></View>
              <View style={styles.settingsRowBody}><Text style={styles.settingsRowTitle}>Notification preferences</Text><Text style={styles.settingsRowHint}>{settings.dailyBriefing ? 'Daily briefing on' : 'Daily briefing off'} · Test delivery</Text></View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.muted} />
            </Pressable>
          </View>
          <Text style={styles.sectionLabel}>ABOUT</Text>
          <View style={styles.settingsGroup}>
            <View style={styles.aboutRow}><Text style={styles.settingsRowTitle}>News source</Text><Text style={styles.settingsRowHint}>Hacker News Algolia API</Text></View>
            <View style={styles.aboutRule} />
            <View style={styles.aboutRow}><Text style={styles.settingsRowTitle}>Local demo profile</Text><Text style={styles.settingsRowHint}>Your profile and saved stories stay on this device.</Text></View>
          </View>
          {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
          <Pressable accessibilityRole="button" onPress={signOut} style={styles.signOutButton}><MaterialCommunityIcons name="logout" size={17} color={COLORS.error} /><Text style={styles.signOutText}>Sign out</Text></Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.appHeader}>
        <Brand />
        <View style={styles.headerActions}>
          <IconButton accessibilityLabel={searchOpen ? 'Close search' : 'Search stories'} name={searchOpen ? 'close' : 'magnify'} onPress={() => { setSearchOpen(!searchOpen); setSearch(''); }} />
          <View style={styles.menuAnchor}>
            <IconButton accessibilityLabel="Open settings menu" name="cog-outline" onPress={() => setMenuOpen(!menuOpen)} selected={menuOpen} />
            {menuOpen ? (
              <View style={styles.menuPopup}>
                <Pressable accessibilityRole="button" onPress={openSettings} style={styles.menuItem}>
                  <MaterialCommunityIcons name="tune-variant" size={19} color={COLORS.green} /><Text style={styles.menuItemText}>Settings</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => navigateTo('profile')} style={styles.menuItem}>
                  <MaterialCommunityIcons name="account-outline" size={19} color={COLORS.green} /><Text style={styles.menuItemText}>Your profile</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </View>
      {searchOpen ? (
        <TextInput autoFocus onChangeText={setSearch} placeholder="Search stories or writers" placeholderTextColor={COLORS.muted} style={styles.searchInput} value={search} />
      ) : null}
      {screen === 'home' ? (
        <>
          <ScrollView
            contentContainerStyle={styles.feedContent}
            refreshControl={<RefreshControl onRefresh={loadStories} refreshing={loadingFeed} tintColor={COLORS.green} />}
          >
            <View style={styles.greetingRow}>
              <View>
                <Text style={styles.dateLine}>{new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()).toUpperCase()}</Text>
                <Text style={styles.greeting}>{`A good day, ${(settings.displayName || profile?.name || 'reader').split(' ')[0]}.`}</Text>
              </View>
              <View style={styles.todayBadge}><View style={styles.liveDot} /><Text style={styles.todayBadgeText}>TODAY</Text></View>
            </View>
            <View style={styles.editorNote}><View style={styles.editorNoteRule} /><View style={styles.editorNoteBody}><Text style={styles.editorNoteLabel}>THE DAILY SIGNAL</Text><Text style={styles.editorNoteTitle}>Curiosity, without the clutter.</Text></View><MaterialCommunityIcons name="weather-sunset-up" size={25} color={COLORS.orange} /></View>
            <ScrollView horizontal contentContainerStyle={styles.filters} showsHorizontalScrollIndicator={false}>
              {FILTERS.map((item) => (
                <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filterChip, filter === item && styles.filterChipActive]}>
                  <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.feedSectionHeading}>
              <Text style={styles.sectionTitle}>{search ? 'SEARCH RESULTS' : filter === 'For you' ? 'FRESH OFF THE WIRE' : filter.toUpperCase()}</Text>
              <Pressable onPress={loadStories} style={styles.refreshTextButton}><MaterialCommunityIcons name="refresh" size={15} color={COLORS.green} /><Text style={styles.refreshText}>Refresh</Text></Pressable>
            </View>
            {feedError ? <EmptyState action="Try again" detail={feedError} icon="wifi-off" onAction={loadStories} title="The signal went quiet" />
              : loadingFeed && stories.length === 0 ? <ActivityIndicator color={COLORS.green} style={styles.feedSpinner} />
                : visibleStories.length === 0 ? <EmptyState detail={search ? 'Try a different search or category.' : 'Pull to refresh and we’ll check for new stories.'} icon={search ? 'text-search' : 'newspaper-variant-outline'} title={search ? 'No matching stories' : 'Nothing new just yet'} />
                  : visibleStories.map((story) => <StoryCard key={story.id} compact={settings.compactCards} onOpen={openStory} onToggleSave={toggleFavorite} saved={favorites.some((saved) => saved.id === story.id)} story={story} />)}
            <View style={styles.feedEnd}><View style={styles.feedEndRule} /><Text style={styles.feedEndText}>THAT'S THE LATEST</Text><View style={styles.feedEndRule} /></View>
          </ScrollView>
          <TabBar active="home" onNavigate={navigateTo} />
        </>
      ) : screen === 'saved' ? (
        <>
          <ScrollView contentContainerStyle={styles.listScreenContent}>
            <PageHeading eyebrow="KEPT CLOSE" title="Your saved stories" />
            <Text style={styles.listSubtitle}>{favorites.length ? `${favorites.length} ${favorites.length === 1 ? 'story' : 'stories'} saved on this device` : 'A quiet place for the stories worth keeping.'}</Text>
            {favorites.length ? favorites.map((story) => <StoryCard key={story.id} compact={settings.compactCards} onOpen={openStory} onToggleSave={toggleFavorite} saved story={story} />)
              : <EmptyState detail="Tap the bookmark on any story and it will find a home here." icon="bookmark-outline" title="Your reading list starts here" action="Explore today’s stories" onAction={() => navigateTo('home')} />}
          </ScrollView>
          <TabBar active="saved" onNavigate={navigateTo} />
        </>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.profileContent}>
            <PageHeading eyebrow="YOUR SIGNAL" title="A space of your own" />
            <View style={styles.profileHero}>
              <View style={styles.profileAvatar}><Text style={styles.profileInitial}>{(settings.displayName || profile?.name || profile?.email || 'S').slice(0, 1).toUpperCase()}</Text></View>
              <Text style={styles.profileName}>{settings.displayName || profile?.name || 'Signal reader'}</Text>
              <Text style={styles.profileEmail}>{profile?.email}</Text>
              <Text style={styles.profileBadge}>LOCAL READER</Text>
            </View>
            <View style={styles.profileStats}>
              <View style={styles.profileStat}><Text style={styles.profileStatNumber}>{favorites.length}</Text><Text style={styles.profileStatCaption}>SAVED STORIES</Text></View>
              <View style={styles.profileStatRule} />
              <View style={styles.profileStat}><Text style={styles.profileStatNumber}>{settings.dailyBriefing ? 'ON' : 'OFF'}</Text><Text style={styles.profileStatCaption}>DAILY BRIEFING</Text></View>
            </View>
            <Text style={styles.sectionLabel}>YOUR SIGNAL</Text>
            <View style={styles.settingsGroup}>
              <ProfileAction icon="bookmark-outline" title="Saved stories" detail={`${favorites.length} in your reading list`} onPress={() => navigateTo('saved')} />
              <ProfileAction icon="cog-outline" title="Reading settings" detail="Preferences and notifications" onPress={openSettings} />
            </View>
            <Text style={styles.profileDisclaimer}>Your profile and reading list are stored on this device. This demo does not send account details to a server.</Text>
          </ScrollView>
          <TabBar active="profile" onNavigate={navigateTo} />
        </>
      )}
      {notice && screen !== 'settings' ? (
        <Pressable accessibilityRole="button" onPress={() => setNotice('')} style={styles.toast}>
          <Text style={styles.toastText}>{notice}</Text>
          <MaterialCommunityIcons name="close" size={16} color={COLORS.paper} />
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  loadingScreen: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  bootSpinner: { marginTop: 24 },
  authScreen: { flex: 1, backgroundColor: COLORS.background },
  authKeyboard: { flex: 1 },
  authContent: { flexGrow: 1, paddingHorizontal: 26, paddingBottom: 38 },
  authTop: { paddingTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  authEdition: { color: COLORS.muted, fontSize: 9, letterSpacing: 1.2, fontWeight: '700' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 28, height: 28, backgroundColor: COLORS.green, borderRadius: 8, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  brandMarkSmall: { width: 23, height: 23, borderRadius: 7 },
  brandMarkBar: { height: 2, width: 12, backgroundColor: COLORS.paper, borderRadius: 2, marginBottom: 3 },
  brandMarkBarShort: { width: 8, marginLeft: -4 },
  brandMarkDot: { width: 3, height: 3, position: 'absolute', right: 5, top: 6, borderRadius: 2, backgroundColor: '#e19b64' },
  brandName: { fontSize: 21, fontWeight: '800', color: COLORS.ink },
  brandNameSmall: { fontSize: 18 },
  brandPeriod: { color: COLORS.orange },
  authBody: { width: '100%', maxWidth: 430, alignSelf: 'center', paddingTop: 72 },
  authAccent: { width: 43, height: 4, borderRadius: 2, backgroundColor: '#ead4bf', marginBottom: 27 },
  authAccentLine: { width: 24, height: 4, backgroundColor: COLORS.orange, borderRadius: 2 },
  authKicker: { fontSize: 10, letterSpacing: 1.3, fontWeight: '700', color: COLORS.orange, marginBottom: 14 },
  authTitle: { color: COLORS.ink, fontSize: 38, lineHeight: 44, fontWeight: '700', marginBottom: 12 },
  authDescription: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginBottom: 28, maxWidth: 340 },
  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, color: COLORS.ink, fontWeight: '600', marginBottom: 7 },
  fieldInput: { height: 48, borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, paddingHorizontal: 14, backgroundColor: COLORS.paper, color: COLORS.ink, fontSize: 14 },
  formError: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: COLORS.lightOrange, borderRadius: 7, marginBottom: 13 },
  formErrorText: { color: COLORS.error, flex: 1, fontSize: 12, lineHeight: 17 },
  actionButton: { height: 49, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.green, borderRadius: 8, paddingHorizontal: 18, marginTop: 6 },
  actionButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.paper },
  pressed: { opacity: 0.72 },
  authSwitch: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  authSwitchText: { color: COLORS.muted, fontSize: 13 },
  authSwitchAction: { color: COLORS.green, fontSize: 13, fontWeight: '700' },
  authFootnote: { textAlign: 'center', color: COLORS.muted, fontSize: 9, fontWeight: '600', letterSpacing: 0.9, marginTop: 36 },
  topBar: { height: 56, paddingHorizontal: 21, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: COLORS.line },
  backButton: { width: 39, height: 39, alignItems: 'flex-start', justifyContent: 'center' },
  topBarSpacer: { width: 39 },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  iconButtonSelected: { backgroundColor: COLORS.lightGreen },
  pageHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 },
  eyebrow: { color: COLORS.orange, fontSize: 10, fontWeight: '700', letterSpacing: 1.25, marginBottom: 8 },
  pageTitle: { color: COLORS.ink, fontSize: 29, fontWeight: '700', lineHeight: 35 },
  detailContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 42 },
  detailHero: { paddingTop: 16, paddingBottom: 30 },
  detailEyebrow: { fontSize: 10, fontWeight: '700', color: COLORS.orange, letterSpacing: 1.15, marginBottom: 16 },
  detailTitle: { color: COLORS.ink, fontSize: 32, lineHeight: 38, fontWeight: '700', marginBottom: 22 },
  detailByline: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  authorAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.lightGreen, alignItems: 'center', justifyContent: 'center' },
  authorInitial: { color: COLORS.green, fontWeight: '700', fontSize: 15 },
  authorName: { color: COLORS.ink, fontSize: 13, fontWeight: '600' },
  authorCaption: { color: COLORS.muted, fontSize: 11, marginTop: 3 },
  detailStats: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.line, minHeight: 75, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 27 },
  detailStatNumber: { color: COLORS.ink, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  detailStatLabel: { color: COLORS.muted, fontSize: 9, letterSpacing: 0.7, textAlign: 'center', marginTop: 4 },
  detailStatRule: { width: 1, height: 27, backgroundColor: COLORS.line },
  detailBody: { fontSize: 15, lineHeight: 25, color: COLORS.ink, marginBottom: 24 },
  sourceNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, padding: 15, backgroundColor: COLORS.lightGreen, borderRadius: 8, marginBottom: 22 },
  sourceNoteText: { flex: 1, color: COLORS.green, fontSize: 13, lineHeight: 20 },
  sourceCaption: { color: COLORS.muted, textAlign: 'center', fontSize: 9, letterSpacing: 1, marginTop: 18 },
  settingsContent: { paddingHorizontal: 24, paddingTop: 26, paddingBottom: 40 },
  sectionLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.1, marginTop: 23, marginBottom: 10 },
  settingsGroup: { backgroundColor: COLORS.paper, borderRadius: 8, borderWidth: 1, borderColor: COLORS.line, overflow: 'hidden' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 14, gap: 11 },
  settingsRowIcon: { width: 35, height: 35, backgroundColor: COLORS.lightGreen, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  settingsRowBody: { flex: 1, justifyContent: 'center' },
  settingsRowTitle: { color: COLORS.ink, fontSize: 13, fontWeight: '600' },
  settingsRowHint: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  settingsNameInput: { marginHorizontal: 14, marginTop: 11, marginBottom: 13, height: 43, borderRadius: 7, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 12, backgroundColor: COLORS.background, color: COLORS.ink, fontSize: 13 },
  settingsActionRow: { minHeight: 66, paddingHorizontal: 13, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.line },
  aboutRow: { padding: 14 },
  aboutRule: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.line, marginHorizontal: 14 },
  notice: { color: COLORS.green, backgroundColor: COLORS.lightGreen, padding: 11, borderRadius: 7, fontSize: 12, lineHeight: 17, marginTop: 15 },
  signOutButton: { marginTop: 20, minHeight: 44, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 7, borderWidth: 1, borderColor: '#e7c8be' },
  signOutText: { color: COLORS.error, fontSize: 13, fontWeight: '600' },
  appHeader: { height: 60, paddingHorizontal: 21, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.line, zIndex: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  menuAnchor: { position: 'relative', zIndex: 4 },
  menuPopup: { position: 'absolute', top: 46, right: 0, width: 183, paddingVertical: 6, backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.line, borderRadius: 9, zIndex: 10, elevation: 5, shadowColor: '#17251d', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  menuItem: { height: 43, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuItemText: { color: COLORS.ink, fontSize: 13, fontWeight: '500' },
  searchInput: { minHeight: 43, marginHorizontal: 21, marginTop: 11, paddingHorizontal: 13, borderWidth: 1, borderColor: COLORS.line, borderRadius: 7, backgroundColor: COLORS.paper, color: COLORS.ink, fontSize: 13 },
  feedContent: { paddingHorizontal: 21, paddingBottom: 21 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 24, paddingBottom: 18 },
  dateLine: { color: COLORS.muted, fontSize: 9, letterSpacing: 1.1, fontWeight: '700', marginBottom: 6 },
  greeting: { fontSize: 23, lineHeight: 29, fontWeight: '700', color: COLORS.ink },
  todayBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 12, backgroundColor: COLORS.lightGreen },
  liveDot: { width: 6, height: 6, backgroundColor: COLORS.green, borderRadius: 3 },
  todayBadgeText: { color: COLORS.green, fontSize: 9, fontWeight: '700', letterSpacing: 0.7 },
  editorNote: { minHeight: 74, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginBottom: 18, backgroundColor: '#efece2', borderRadius: 8 },
  editorNoteRule: { height: 35, width: 3, borderRadius: 2, backgroundColor: COLORS.orange, marginRight: 12 },
  editorNoteBody: { flex: 1 },
  editorNoteLabel: { fontSize: 9, letterSpacing: 1, fontWeight: '700', color: COLORS.muted, marginBottom: 4 },
  editorNoteTitle: { fontSize: 14, fontWeight: '600', color: COLORS.ink },
  filters: { gap: 8, paddingBottom: 21, paddingRight: 14 },
  filterChip: { minHeight: 33, justifyContent: 'center', paddingHorizontal: 13, borderWidth: 1, borderColor: COLORS.line, borderRadius: 17, backgroundColor: COLORS.paper },
  filterChipActive: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  filterText: { color: COLORS.muted, fontSize: 11, fontWeight: '600' },
  filterTextActive: { color: COLORS.paper },
  feedSectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { color: COLORS.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1.1 },
  refreshTextButton: { flexDirection: 'row', gap: 4, alignItems: 'center', padding: 4 },
  refreshText: { color: COLORS.green, fontSize: 11, fontWeight: '600' },
  storyCard: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  storyCardCompact: { paddingVertical: 10 },
  storyCardPressed: { opacity: 0.7 },
  storyMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 },
  storyCategory: { color: COLORS.orange, fontSize: 9, fontWeight: '700' },
  metaDot: { color: COLORS.muted, fontSize: 12 },
  storyAge: { color: COLORS.muted, fontSize: 10 },
  storyTitle: { color: COLORS.ink, fontSize: 16, lineHeight: 22, fontWeight: '600', paddingRight: 8 },
  storyFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  storyStats: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  storyStat: { color: COLORS.muted, fontSize: 10, marginRight: 6 },
  storyAuthor: { color: COLORS.muted, fontSize: 10, flexShrink: 1 },
  storyActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  saveButton: { padding: 3 },
  feedSpinner: { marginVertical: 48 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 38 },
  emptyIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.lightGreen, borderRadius: 18, marginBottom: 14 },
  emptyTitle: { color: COLORS.ink, fontWeight: '600', fontSize: 15, textAlign: 'center' },
  emptyDetail: { maxWidth: 290, color: COLORS.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7 },
  textAction: { marginTop: 14, padding: 5 },
  textActionLabel: { color: COLORS.green, fontWeight: '700', fontSize: 12 },
  feedEnd: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11, paddingTop: 24, paddingBottom: 8 },
  feedEndRule: { width: 25, height: 1, backgroundColor: COLORS.line },
  feedEndText: { color: COLORS.muted, fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  tabBar: { minHeight: 59, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.paper },
  tabItem: { minWidth: 68, minHeight: 53, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabLabel: { color: COLORS.muted, fontSize: 9, fontWeight: '500' },
  tabLabelActive: { color: COLORS.green, fontWeight: '700' },
  listScreenContent: { flexGrow: 1, paddingHorizontal: 21, paddingTop: 26, paddingBottom: 24 },
  listSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 3, marginBottom: 17 },
  profileContent: { flexGrow: 1, paddingHorizontal: 21, paddingTop: 25, paddingBottom: 25 },
  profileHero: { alignItems: 'center', paddingVertical: 26, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  profileAvatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.green },
  profileInitial: { color: COLORS.paper, fontSize: 26, fontWeight: '700' },
  profileName: { color: COLORS.ink, fontSize: 21, fontWeight: '700', marginTop: 12 },
  profileEmail: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  profileBadge: { color: COLORS.green, backgroundColor: COLORS.lightGreen, fontSize: 9, fontWeight: '700', letterSpacing: 0.8, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, overflow: 'hidden', marginTop: 11 },
  profileStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', paddingVertical: 19, borderBottomWidth: 1, borderColor: COLORS.line },
  profileStat: { alignItems: 'center', gap: 5 },
  profileStatNumber: { color: COLORS.ink, fontSize: 18, fontWeight: '700' },
  profileStatCaption: { color: COLORS.muted, fontSize: 9, letterSpacing: 0.7, fontWeight: '600' },
  profileStatRule: { width: 1, height: 28, backgroundColor: COLORS.line },
  profileDisclaimer: { color: COLORS.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 19, paddingHorizontal: 12 },
  toast: { position: 'absolute', bottom: 74, left: 18, right: 18, minHeight: 43, borderRadius: 8, backgroundColor: COLORS.green, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toastText: { flex: 1, color: COLORS.paper, fontSize: 12, lineHeight: 17, marginRight: 10 },
});