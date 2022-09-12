import { firebaseAuth, firebaseDb, firebaseStorage } from '@/firebase/init'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore'
import {
  getStorage,
  ref,
  uploadBytes,
  deleteObject,
  getDownloadURL,
  uploadString,
} from 'firebase/storage'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  updatePassword,
  updateEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth'
import store from '@/redux/store'
import {
  setAuthenticated,
  setUserData,
  setUserPending,
} from '@/redux/slices/user'
import { clearRegistrationForm } from '@/redux/slices/registration-form'
import {
  createwallet,
  getWalletAddressAndPaymail,
  getwalletDetails,
} from '@/services/relysia-queries'
import apiConfig from '@/config/relysiaApi'

const firebaseGetUserInfoFromDb = async (id) => {
  try {
    const docRef = doc(firebaseDb, 'users', id)
    const docSnap = await getDoc(docRef)
    return docSnap.data()
  } catch (error) {
    console.error(error)
  }
}

const firebaseIsUsernameExist = async (username) => {
  console.log(username)
  const querySnapshot = await getDocs(collection(firebaseDb, 'users'))
  let isExist

  querySnapshot.forEach((doc) => {
    if (doc.data().username === username) {
      isExist = true
    }
  })

  return isExist
}

const firebaseLogin = async ({ email, password, rememberMe }) => {
  try {
    await setPersistence(
      firebaseAuth,
      rememberMe ? browserLocalPersistence : browserSessionPersistence,
    )
    const auth = await signInWithEmailAndPassword(firebaseAuth, email, password)
    return {
      name: auth.user.displayName,
      uid: auth.user.uid,
      email: auth.user.email,
      accessToken: auth.user.accessToken,
    }
  } catch (error) {
    return { error: 'Incorrect email or password.' }
  }
}

const firebaseRegister = async (data) => {
  const { email, password, username, name } = data
  try {
    const response = await createUserWithEmailAndPassword(
      firebaseAuth,
      email,
      password,
    )

    const { user } = response

    if (user) {
      store.dispatch(setAuthenticated(!!user))
    }

    const infos = {
      displayName: name,
      name: name,
      email: user.email,
      username: username,
      uid: user.uid,
      createdAt: user.metadata.creationTime,
      profileImage: null,
      coverImage: null,
      socialLinks: {
        facebook: data.facebook || '',
        instagram: data.instagram || '',
        website: data.website || '',
      },
    }
    await setDoc(doc(firebaseDb, 'users', user.uid), infos)
    const createdUser = await firebaseGetUserInfoFromDb(user.uid)

    return createdUser
  } catch (error) {
    console.log(error)
    return { error: error.message }
  }
}

const firebaseLogout = async () => {
  await firebaseAuth.signOut()
  store.dispatch(clearRegistrationForm())
}

const firebaseLoginWithGoogle = async () => {
  try {
    const firebaseGoogleProvider = new GoogleAuthProvider()
    firebaseGoogleProvider.setCustomParameters({
      prompt: 'select_account',
    })
    const userInfo = await signInWithPopup(firebaseAuth, firebaseGoogleProvider)
      .then(async (result) => {
        // This gives you a Google Access Token. You can use it to access the Google API.
        const credential = GoogleAuthProvider.credentialFromResult(result)
        const token = credential?.accessToken
        // The signed-in user info.
        const user = result.user
        let fileRef = ref(
          firebaseStorage,
          `profiles/${user.uid}_256x256?alt=media`,
        )
        if (user.photoURL) {
          await uploadBytes(fileRef, user.photoURL)
        }
        const userInfoFromDb = await firebaseGetUserInfoFromDb(user.uid)
        if (!userInfoFromDb) {
          const infos = {
            displayName: user.displayName,
            email: user.email,
            uid: user.uid,
            photoPATH: null,
            createdAt: user.metadata.creationTime,
          }

          await setDoc(doc(firebaseDb, 'users', user.uid), infos)
          store.dispatch(
            setUserData({
              name: user.displayName,
              uid: user.uid,
              email: user.email,
              photoURL: user.photoURL,
            }),
          )
        } else {
          store.dispatch(
            setUserData({
              name: user.displayName,
              uid: user.uid,
              email: user.email,
              photoURL: user.photoURL,
            }),
          )
        }
        return { credential, token, user }
      })
      .catch((error) => {
        // Handle Errors here.
        const errorCode = error.code
        const errorMessage = error.message
        // The email of the user's account used.
        const email = error.email
        // The AuthCredential type that was used.
        const credential = GoogleAuthProvider.credentialFromError(error)
        console.error({ errorCode, errorMessage, email, credential })
      })
    return userInfo?.user
  } catch (error) {
    console.error(error)
  }
}

const firebaseResetPassword = async (user, newPassword) => {
  try {
    await updatePassword(user, newPassword)

    return { success: 'Password change successful.' }
  } catch (error) {
    console.log(error)
    return {
      error: error.message,
    }
  }
}

const firebaseUploadImage = async ({ user, imageFile, imageType, ext }) => {
  if (user && imageFile) {
    const imageFolder = imageType === 'profileImage' ? 'profiles' : 'banners'
    const imagePath = `${imageFolder}/${user.uid}.${ext}`
    const storage = getStorage()
    const userInfoFromDb = await firebaseGetUserInfoFromDb(user.uid)
    const userRef = doc(firebaseDb, 'users', user.uid)
    const fileRef = ref(storage, imagePath)
    const oldRef = ref(storage, userInfoFromDb[imageType])

    try {
      await uploadBytes(fileRef, imageFile)

      const firebaseProfileURL = await getDownloadURL(ref(storage, imagePath))
      await updateProfile(user, { [imageType]: firebaseProfileURL })

      if (userInfoFromDb[imageType]) {
        deleteObject(oldRef).catch((error) => console.log(error))
      }

      store.dispatch(
        setUserData({
          [imageType]: firebaseProfileURL,
        }),
      )

      await updateDoc(userRef, {
        ...userInfoFromDb,
        [imageType]: firebaseProfileURL,
      })
    } catch (error) {
      console.log(error)
    }
  }
  return { message: 'fail' }
}

const firebaseDeleteImage = async ({ uid, imageType }) => {
  const storage = getStorage()
  const userInfoFromDb = await firebaseGetUserInfoFromDb(uid)
  const imgRef = ref(storage, userInfoFromDb[imageType])
  const userRef = doc(firebaseDb, 'users', uid)

  deleteObject(imgRef).catch((error) => alert(error.message))
  store.dispatch(
    setUserData({
      [imageType]: '',
    }),
  )
  await updateDoc(userRef, {
    ...userInfoFromDb,
    [imageType]: '',
  })
}

const firebaseUpdateProfile = async ({ uid, values }) => {
  try {
    const userInfoFromDb = await firebaseGetUserInfoFromDb(uid)
    const mergedValues = { ...userInfoFromDb, ...values }
    const userRef = doc(firebaseDb, 'users', uid)
    await updateDoc(userRef, mergedValues, uid)
    store.dispatch(setUserData(mergedValues))
    return mergedValues
  } catch (error) {
    console.log(error)
    return { error: error.message }
  }
}

const updateUserEmail = async (user, email) => {
  try {
    await updateEmail(user, email)
    store.dispatch(
      setUserData({
        name: user.displayName,
        uid: user.uid,
        email: email,
      }),
    )

    return { success: 'Email has been updated.' }
  } catch (error) {
    console.log(error)
    return {
      error: error.message,
    }
  }
}

const firebaseGetSingleDoc = async (collectionName, id) => {
  try {
    const docRef = doc(firebaseDb, collectionName, id)
    const docSnap = await getDoc(docRef)
    return docSnap.data()
  } catch (error) {
    console.error(error)
  }
}

const firebaseGetFirstNfts = async (pageLimit, order = 'timestamp') => {
  const queryRef = query(
    collection(firebaseDb, 'nfts'),
    orderBy(order, 'desc'),
    limit(pageLimit),
  )

  const nfts = await getDocs(queryRef)
  return nfts.docs.map((doc) => {
    const docData = doc.data()
    return {
      id: doc.id,
      ...docData,
    }
  })
}

const firebsaeFetchNextData = async (
  item,
  pageLimit = 20,
  order = 'timestamp',
) => {
  const queryRef = query(
    collection(firebaseDb, 'nfts'),
    limit(pageLimit),
    orderBy(order, 'desc'),
    startAfter(item),
  )

  const nfts = await getDocs(queryRef)
  return nfts.docs.map((doc) => {
    const docData = doc.data()
    return {
      id: doc.id,
      ...docData,
    }
  })
}

const firebaseGetFilterNfts = async (priceRange) => {
  const { min, max } = priceRange
  const queryRef = query(
    collection(firebaseDb, 'nfts'),
    where('amount', '>=', parseInt(min)),
    where('amount', '<=', parseInt(max)),
    limit(20),
  )

  const nfts = await getDocs(queryRef)
  return nfts.docs.map((doc) => {
    const docData = doc.data()
    return {
      id: doc.id,
      ...docData,
    }
  })
}

const firbaseAddDoc = async (collectionName, id, obj) => {
  try {
    const docRef = doc(firebaseDb, collectionName, id)
    await setDoc(docRef, { ...obj, timeStamp: Timestamp.now() })
  } catch (error) {
    console.error(error)
  }
}

const firbaseUpdateDoc = async (collectionName, id, obj) => {
  try {
    const docRef = doc(firebaseDb, collectionName, id)
    await updateDoc(docRef, obj)
  } catch (error) {
    console.error(error)
  }
}

const firbaseDeleteDoc = async (collectionName, id) => {
  try {
    const docRef = doc(firebaseDb, collectionName, id)
    await deleteDoc(docRef)
  } catch (error) {
    console.error(error)
  }
}

const firebaseGetAuthorizedUser = () => {
  const fn = firebaseAuth.onAuthStateChanged(async (userResponse) => {
    if (userResponse) {
      const user = await firebaseGetUserInfoFromDb(userResponse.uid)
      store.dispatch(setUserData(user))
      store.dispatch(setAuthenticated(true))
    } else {
      console.log('not auth')
      store.dispatch(setAuthenticated(false))
    }
    store.dispatch(setUserPending(false))
  })

  return fn
}

const firebaseOnIdTokenChange = async () => {
  const walletId = '00000000-0000-0000-0000-000000000000'
  const paymail = store.getState().user.paymail
  const address = store.getState().user.address

  firebaseAuth.onIdTokenChanged(async (user) => {
    if (user) {
      apiConfig.defaults.headers.common['authToken'] = user.accessToken
      if (!paymail && !address) {
        const walletData = await getWalletAddressAndPaymail(walletId)
        if (walletData.address && walletData.paymail) {
          getwalletDetails(walletId, store.dispatch)
        } else {
          createwallet('default', store.dispatch)
        }
      }
    }
  })
}

const firebaseUploadBlob = async (file, name, type) => {
  let link
  const blob = file.split(',')[1]
  const storage = getStorage()
  const storageRef = ref(storage, `nfts/${name}.${type}`)
  await uploadString(storageRef, blob, 'base64', {
    contentType: `image/${type}`,
  }).then(async (snapshot) => {
    return new Promise((resolve) => {
      resolve(getDownloadURL(snapshot.ref).then((res) => (link = res)))
    })
  })
  return link
}

export {
  firebaseLogin,
  firebaseRegister,
  firebaseGetAuthorizedUser,
  firebaseLogout,
  firebaseUploadImage,
  firebaseUpdateProfile,
  firebaseLoginWithGoogle,
  firebaseGetUserInfoFromDb,
  firebaseGetFirstNfts,
  firebaseGetFilterNfts,
  firebaseIsUsernameExist,
  firebaseGetSingleDoc,
  firbaseAddDoc,
  firbaseDeleteDoc,
  firbaseUpdateDoc,
  firebsaeFetchNextData,
  firebaseDeleteImage,
  firebaseOnIdTokenChange,
  firebaseUploadBlob,
}
