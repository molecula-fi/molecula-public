import RNAsyncStorage from '@react-native-async-storage/async-storage';

import type { AsyncStorage } from '../types';

// Export the storage instance which can be used in the application
export const appStorage: AsyncStorage = RNAsyncStorage;
