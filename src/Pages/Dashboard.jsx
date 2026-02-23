import React from "react";

const Dashboard = () => {
  const styles = {
    container: {
      minHeight: "100vh",
      backgroundColor: "#f4f4f4", // secondary light
      fontFamily: "Arial, sans-serif",
      padding: "20px",
    },
    header: {
      backgroundColor: "#000000", // primary black
      color: "#ffffff",
      padding: "15px 20px",
      borderRadius: "6px",
      marginBottom: "20px",
    },
    title: {
      margin: 0,
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: "20px",
    },
    card: {
      backgroundColor: "#ffffff",
      padding: "20px",
      borderRadius: "8px",
      boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
      textAlign: "center",
    },
    cardTitle: {
      color: "#000000",
      marginBottom: "10px",
    },
    cardValue: {
      fontSize: "22px",
      fontWeight: "bold",
      color: "#2e7d32", // soft green
    },
    placeholder: {
      marginTop: "40px",
      backgroundColor: "#ffffff",
      padding: "30px",
      borderRadius: "8px",
      boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
      textAlign: "center",
      color: "#555",
    },
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>CCTV Surveillance Dashboard</h2>
      </div>

      {/* Stats Cards (Future Data) */}
      <div style={styles.grid}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Total Cameras</h3>
          <p style={styles.cardValue}>--</p>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Active Cameras</h3>
          <p style={styles.cardValue}>--</p>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Alerts Today</h3>
          <p style={styles.cardValue}>--</p>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Storage Used</h3>
          <p style={styles.cardValue}>--</p>
        </div>
      </div>

      {/* Placeholder Section */}
      <div style={styles.placeholder}>
        <h3>No Data Available</h3>
        <p>
          Dashboard analytics, camera feeds, alerts, and reports
          will be displayed here once the system is connected
          to backend and database.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;