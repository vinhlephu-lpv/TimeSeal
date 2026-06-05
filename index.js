/**
 * @format
 */

import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

messaging().setBackgroundMessageHandler(async () => {
  // Keep handler registered for background/quit notification flow.
});

notifee.onBackgroundEvent(async () => {
  // Keep Notifee handler registered for local notification background events.
});

AppRegistry.registerComponent(appName, () => App);
