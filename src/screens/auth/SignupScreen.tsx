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

type Props = NativeStackScreenProps<AuthStackParamList, "Signup">;

interface SignupValues {
  name: string;
  email: string;
  password: string;
}

export const SignupScreen = ({ navigation }: Props): React.JSX.Element => {
  const { signUp } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit } = useForm<SignupValues>({
    defaultValues: { name: "", email: "", password: "" }
  });

  return (
    <Screen scroll={false}>
      <View style={styles.container}>
        <Text style={styles.title}>Create Account</Text>
        <Controller
          control={control}
          name="name"
          rules={{ required: "Name is required." }}
          render={({ field: { value, onChange }, fieldState: { error: fieldError } }) => (
            <FormInput label="Name" value={value} onChangeText={onChange} error={fieldError?.message} />
          )}
        />
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
          label="Create Account"
          loading={loading}
          onPress={handleSubmit(async (values) => {
            setLoading(true);
            setError(null);
            try {
              await signUp(values.email.trim(), values.password, values.name.trim());
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setLoading(false);
            }
          })}
        />
        <Text style={styles.link} onPress={() => navigation.navigate("Login")}>
          Already have an account? Sign in
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
    fontSize: 30,
    fontWeight: "800",
    color: colors.text
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
