import React from "react";

const History = () => {
  const styles = {
    container: {
      minHeight: "100vh",
      backgroundColor: "#f4f4f4", // light secondary
      padding: "40px",
      fontFamily: "Arial, sans-serif",
    },
    heading: {
      color: "#000000", // primary black
      marginBottom: "20px",
      textAlign: "center",
    },
    card: {
      backgroundColor: "#ffffff",
      padding: "30px",
      borderRadius: "8px",
      boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
      textAlign: "center",
      maxWidth: "600px",
      margin: "0 auto",
    },
    message: {
      color: "#555",
      marginBottom: "20px",
    },
    button: {
      padding: "10px 20px",
      backgroundColor: "#2e7d32", // soft green
      color: "#ffffff",
      border: "none",
      borderRadius: "5px",
      cursor: "pointer",
      fontWeight: "bold",
    },
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>User History</h2>

      <div style={styles.card}>
        <p style={styles.message}>
          No history data available right now.
          <br />
          This section will display user activity, login records,
          CCTV monitoring logs, or reports in the future.
        </p>

        <button style={styles.button}>
          Refresh
        </button>
      </div>
    </div>
  );
};

export default History;