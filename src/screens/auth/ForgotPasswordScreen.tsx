import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "@/types/navigation";
import { Screen } from "@/components/common/Screen";
import { FormInput } from "@/components/common/FormInput";
import { PrimaryButton } from "@/components/common/PrimaryButton";
import { useAuth } from "@/hooks/useAuth";
import { colors } from "@/constants/theme";

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

export const ForgotPasswordScreen = ({ navigation }: Props): React.JSX.Element => {
  const { recoverPassword } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit } = useForm<{ email: string }>({
    defaultValues: { email: "" }
  });

  return (
    <Screen scroll={false}>
      <View style={styles.container}>
        <Text style={styles.title}>Recover Password</Text>
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
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton
          label="Send Reset Link"
          onPress={handleSubmit(async ({ email }) => {
            setError(null);
            setMessage(null);
            try {
              await recoverPassword(email.trim());
              setMessage("If this email exists, a reset link has been sent.");
            } catch (err) {
              setError((err as Error).message);
            }
          })}
        />
        <Text style={styles.link} onPress={() => navigation.navigate("Login")}>
          Back to sign in
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
  success: {
    color: colors.primary
  },
  error: {
    color: colors.danger
  },
  link: {
    color: colors.primary,
    textAlign: "center",
    fontWeight: "600",
    marginTop: 8
  }
});
