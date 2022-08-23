import { envMODE } from '../config/envMode'
import apiConfig from '@/config/relysiaApi'

let config
let storageBucket = ''

if (envMODE === 'DEV') {
  config = {
    apiKey: 'AIzaSyBm1PRFUgyethkZdRHCkjZ2IJh5PQiD0hg',
    authDomain: 'openft-98e94.firebaseapp.com',
    projectId: 'openft-98e94',
    storageBucket: 'openft-98e94.appspot.com',
    messagingSenderId: '635036232353',
    appId: '1:635036232353:web:53d0930c0a1a309f801ee0',
    measurementId: 'G-NRVT06LPJT',
  }

  storageBucket =
    'https://firebasestorage.googleapis.com/v0/b/openft-98e94.appspot.com/o/'

  apiConfig.defaults.headers.common['serviceId'] =
    '9cf81e50-eeb9-40dd-a790-10a0813b48b5'
}

export default config
export const storageBucketUrl = storageBucket
