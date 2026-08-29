import { useEffect, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged, User } from "firebase/auth";

import { auth } from "./src/lib/firebase";
import { logoutUser } from "./src/lib/auth";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    if (showRegister) {
      return (
        <View style={styles.container}>
          <RegisterScreen />
          <Button
            title="Already have an account? Login"
            onPress={() => setShowRegister(false)}
          />
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <LoginScreen />
        <Button
          title="Don't have an account? Register"
          onPress={() => setShowRegister(true)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text>Welcome!</Text>
      <Text>{user.email}</Text>

      <Button title="Logout" onPress={logoutUser} />

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
});
