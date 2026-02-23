import React from "react";

const Landing = () => {
  const styles = {
    container: {
      fontFamily: "Arial, sans-serif",
      backgroundColor: "#f4f4f4", // light secondary
      minHeight: "100vh",
    },
    navbar: {
      backgroundColor: "#000000", // primary black
      color: "#ffffff",
      padding: "15px 40px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    navLinks: {
      display: "flex",
      gap: "20px",
      cursor: "pointer",
    },
    hero: {
      textAlign: "center",
      padding: "80px 20px",
    },
    heading: {
      fontSize: "36px",
      color: "#000000",
      marginBottom: "20px",
    },
    subText: {
      fontSize: "18px",
      color: "#555",
      marginBottom: "30px",
    },
    button: {
      padding: "12px 25px",
      backgroundColor: "#2e7d32", // soft green
      color: "#ffffff",
      border: "none",
      borderRadius: "5px",
      cursor: "pointer",
      fontSize: "16px",
      fontWeight: "bold",
    },
    section: {
      padding: "50px 20px",
      textAlign: "center",
    },
    sectionTitle: {
      fontSize: "28px",
      marginBottom: "20px",
      color: "#000",
    },
    footer: {
      backgroundColor: "#000000",
      color: "#ffffff",
      textAlign: "center",
      padding: "15px",
      marginTop: "40px",
    },
  };

  return (
    <div style={styles.container}>
      {/* Navbar */}
      <div style={styles.navbar}>
        <h2>CCTV Secure</h2>
        <div style={styles.navLinks}>
          <span>Home</span>
          <span>Services</span>
          <span>Login</span>
          <span>Register</span>
        </div>
      </div>

      {/* Hero Section */}
      <div style={styles.hero}>
        <h1 style={styles.heading}>Smart CCTV Surveillance Solutions</h1>
        <p style={styles.subText}>
          Secure your home and business with advanced monitoring systems.
          Reliable, scalable, and intelligent protection.
        </p>
        <button style={styles.button}>Get Started</button>
      </div>

      {/* Services Section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Our Services</h2>
        <p>
          ✔ 24/7 Live Monitoring <br />
          ✔ Cloud Storage Support <br />
          ✔ High Resolution Cameras <br />
          ✔ Remote Access & Alerts
        </p>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        © 2026 CCTV Secure. All Rights Reserved.
      </div>
    </div>
  );
};

export default Landing;