import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Controller, useForm } from "react-hook-form";
import { Screen } from "@/components/common/Screen";
import { FormInput } from "@/components/common/FormInput";
import { PrimaryButton } from "@/components/common/PrimaryButton";
import { AuthStackParamList } from "@/types/navigation";
import { colors } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

interface LoginValues {
  email: string;
  password: string;
}

export const LoginScreen = ({ navigation }: Props): React.JSX.Element => {
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit } = useForm<LoginValues>({
    defaultValues: { email: "", password: "" }
  });

  return (
    <Screen scroll={false}>
      <View style={styles.container}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Track your nutrition goals every day.</Text>
        <Controller
          control={control}
          name="email"
          rules={{ required: "Email is required." }}
          render={({ field: { value, onChange }, fieldState: { error: fieldError } }) => (
            <FormInput
              label="Email"
              value={value}
              onChangeText={onChange}
              keyboardType="email-address"
              error={fieldError?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          rules={{ required: "Password is required." }}
          render={({ field: { value, onChange }, fieldState: { error: fieldError } }) => (
            <FormInput
              label="Password"
              value={value}
              onChangeText={onChange}
              secureTextEntry
              error={fieldError?.message}
            />
          )}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton
          label="Sign In"
          loading={loading}
          onPress={handleSubmit(async (values) => {
            setError(null);
            setLoading(true);
            try {
              await signIn(values.email.trim(), values.password);
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setLoading(false);
            }
          })}
        />
        <PrimaryButton label="Create Account" onPress={() => navigation.navigate("Signup")} />
        <Text style={styles.link} onPress={() => navigation.navigate("ForgotPassword")}>
          Forgot password?
        </Text>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    gap: 12
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.text
  },
  subtitle: {
    marginBottom: 8,
    color: colors.mutedText
  },
  error: {
    color: colors.danger
  },
  link: {
    color: colors.primary,
    textAlign: "center",
    marginTop: 8,
    fontWeight: "600"
  }
});
