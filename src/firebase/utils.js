import { firebaseAuth, firebaseDb, firebaseStorage } from '@/firebase/init'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  setDoc,
  startAfter,
  startAt,
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
import { storageBucketUrl } from './config'

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

const firebaseUploadNftImage = async ({ file, userId }) => {
  try {
    const imagePath = `nfts/${userId}/${file.name}`
    const fileRef = ref(firebaseStorage, imagePath)
    const fileFromStorage = await uploadBytes(fileRef, file)
    const url = await getDownloadURL(fileRef)
    return { url, fileFromStorage }
  } catch (error) {
    console.log(error)
    return { error: error.message }
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

const firebaseGetNftProductsCount = async () => {
  try {
    const querySnapshot = await getDocs(collection(firebaseDb, 'nftCounter'))
    const nftCount = querySnapshot.docs[0].data().count

    return nftCount
  } catch (error) {
    console.error(error.message)
  }
}

const firebaseGetNftProducts = async (pageLimit, page) => {
  const start = page > 1 && pageLimit * parseInt(page) - pageLimit - 1

  const nftsRef = collection(firebaseDb, 'nfts')
  const queryRef = query(
    nftsRef,
    orderBy('timestamp', 'desc'),
    limit(pageLimit),
  )

  const collectionSize = await firebaseGetNftProductsCount()
  const documentSnapshots = await getDocs(queryRef)

  const lastVisible = documentSnapshots.docs[start]
  const nextRef = collection(firebaseDb, 'nfts')

  const next = query(
    nextRef,
    orderBy('timestamp', 'desc'),
    startAfter(lastVisible || ''),
    limit(pageLimit),
  )

  const nextSnapshots = await getDocs(next)

  const nfts = nextSnapshots.docs.map((doc) => {
    const nft = doc.data()
    nft.id = doc.id
    return nft
  })

  return { nftsData: JSON.parse(JSON.stringify(nfts)), collectionSize }
}

const firebaseGetNftProductsSearchResult = async (searchValue) => {}

const firebaseGetFilteredNftProducts = async (pageLimit, page, priceRange) => {
  const { minPrice, maxPrice } = priceRange
  const start = page > 1 && pageLimit * +page - pageLimit - 1

  const nftsRef = collection(firebaseDb, 'nfts')
  const queryRef = query(
    nftsRef,
    orderBy('amount', 'desc'),
    where('amount', '>=', +minPrice),
    where('amount', '<=', +maxPrice),
  )

  const documentSnapshots = await getDocs(queryRef)

  const lastVisible = documentSnapshots.docs[start]
  const nextRef = collection(firebaseDb, 'nfts')

  const next = query(
    nextRef,
    limit(pageLimit),
    orderBy('amount', 'desc'),
    where('amount', '>=', minPrice),
    where('amount', '<=', maxPrice),
    startAfter(lastVisible || ''),
  )

  const nextSnapshots = await getDocs(next)

  const nfts = nextSnapshots.docs.map((doc) => {
    const nft = doc.data()
    nft.id = doc.id
    return nft
  })

  return {
    nftsData: JSON.parse(JSON.stringify(nfts)),
    collectionSize: documentSnapshots.docs.length,
  }
}

const firebaseAddDoc = async (collectionName, obj) => {
  console.log(obj)
  try {
    const docRef = collection(firebaseDb, collectionName)
    const nftDoc = await addDoc(docRef, { ...obj, timestamp: Timestamp.now() })
    await firebaseUpdateDoc(collectionName, nftDoc.id, {
      uid: nftDoc.id,
    })

    return nftDoc
  } catch (error) {
    console.error(error.message)
  }
}

const firebaseUpdateDoc = async (collectionName, id, obj) => {
  try {
    const docRef = doc(firebaseDb, collectionName, id)
    await updateDoc(docRef, obj)
  } catch (error) {
    console.error(error)
  }
}

const firebaseDeleteDoc = async (collectionName, id) => {
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

const firebaseGetNftImageUrl = (userId, fileName, size) => {
  console.log(userId, fileName, size)
  const extension = fileName.split('.').pop()
  const fileNameWithoutExtension = fileName.replace(`.${extension}`, '')
  const path = encodeURIComponent(
    `nfts/${userId}/nft-assets/${fileNameWithoutExtension}`,
  )
  switch (size) {
    case 'xsmall':
      return `${storageBucketUrl}${path}_60x60.${extension}?alt=media`
    case 'small':
      return `${storageBucketUrl}${path}_250x250.${extension}?alt=media`
    case 'medium':
      return `${storageBucketUrl}${path}_600x600.${extension}?alt=media`
    case 'large':
      return `${storageBucketUrl}${path}_1500x1500.${extension}?alt=media`
    case 'xlarge':
      return `${storageBucketUrl}${path}_3000x3000.${extension}?alt=media`
    default:
      return `${storageBucketUrl}${path}_600x600.${extension}?alt=media`
  }
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
  firebaseGetNftProducts,
  firebaseGetNftProductsSearchResult,
  firebaseGetFilteredNftProducts,
  firebaseIsUsernameExist,
  firebaseGetSingleDoc,
  firebaseAddDoc,
  firebaseDeleteDoc,
  firebaseUpdateDoc,
  firebaseDeleteImage,
  firebaseOnIdTokenChange,
  firebaseUploadNftImage,
  firebaseGetNftImageUrl,
}
