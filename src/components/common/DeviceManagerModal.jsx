import React, { useState, useEffect } from "react";
import { T } from "../../constants/theme";
import Modal from "./Modal";
import Btn from "./Btn";
import Input from "./Input";
import Field from "./Field";
import { generateAdminOTP, verifyAdminOTP, swapAuthorizedDevice } from "../../services/deviceManagementService";

export function DeviceManagerModal({
  deviceState,
  onAuthorized,
  onClose,
}) {
  const [step, setStep] = useState("otp"); // 'otp' | 'swap'
  const [otpCode, setOtpCode] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [selectedOldDevice, setSelectedOldDevice] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const code = generateAdminOTP();
    setGeneratedOtp(code);
  }, []);

  const handleVerifyOtp = () => {
    if (!verifyAdminOTP(otpCode)) {
      setErrorMsg("Invalid OTP code. Please enter the code shown above.");
      return;
    }
    setErrorMsg("");
    setStep("swap");
  };

  const handleConfirmSwap = async () => {
    if (!selectedOldDevice) {
      alert("Please select one existing PC to replace.");
      return;
    }
    const res = await swapAuthorizedDevice(deviceState.shopId || "default_shop", selectedOldDevice);
    if (res.success) {
      alert("✅ PC Authorized successfully!");
      if (onAuthorized) onAuthorized();
    } else {
      alert("Failed to authorize device.");
    }
  };

  return (
    <Modal
      title={step === "otp" ? "🔐 Admin Device Authorization Required" : "💻 Manage Authorized Devices (Max 4)"}
      onClose={onClose}
      width={520}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {step === "otp" && (
          <>
            <div style={{ background: T.amberDim, border: `1px solid ${T.amber}`, borderRadius: 8, padding: 12, fontSize: 13, color: T.amber }}>
              <b>4-PC Limit Reached:</b> A 5th PC ({deviceState.deviceName}) is trying to log in. Please enter the Admin OTP verification code to authorize this device.
            </div>

            <div style={{ background: T.surface, padding: 12, borderRadius: 8, textAlign: "center", border: `1px dashed ${T.border}` }}>
              <div style={{ fontSize: 12, color: T.muted }}>Admin Email: <b>{deviceState.adminEmail}</b></div>
              <div style={{ fontSize: 24, fontWeight: 800, color: T.accent, letterSpacing: 4, marginTop: 6 }}>
                {generatedOtp}
              </div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>(One-Time Verification Code)</div>
            </div>

            <Field label="Enter 6-Digit OTP Code">
              <Input
                placeholder="Enter 6-digit OTP"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                maxLength={6}
                style={{ textAlign: "center", fontSize: 18, letterSpacing: 4 }}
              />
            </Field>

            {errorMsg && <div style={{ color: T.red, fontSize: 12 }}>{errorMsg}</div>}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <Btn onClick={handleVerifyOtp}>Verify OTP & Continue →</Btn>
            </div>
          </>
        )}

        {step === "swap" && (
          <>
            <div style={{ fontSize: 13, color: T.text }}>
              Select <b>ONE</b> existing PC below to replace and deactivate. The new PC <b>({deviceState.deviceName})</b> will take its place.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(deviceState.devices || []).map((dev) => {
                const isSelected = selectedOldDevice === dev.id;
                return (
                  <div
                    key={dev.id}
                    onClick={() => setSelectedOldDevice(dev.id)}
                    style={{
                      border: `1.5px solid ${isSelected ? T.accent : T.border}`,
                      background: isSelected ? T.accentDim : T.surface,
                      borderRadius: 8,
                      padding: "10px 14px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "all .15s",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{dev.name || dev.id}</div>
                      <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>ID: {dev.id}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: T.green }}>Authorized</div>
                      <div style={{ fontSize: 10, color: T.muted }}>
                        {dev.lastActive ? `Active: ${dev.lastActive.slice(0, 10)}` : "Active"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <Btn variant="secondary" onClick={() => setStep("otp")}>← Back</Btn>
              <Btn onClick={handleConfirmSwap}>Authorize New PC</Btn>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export default DeviceManagerModal;
