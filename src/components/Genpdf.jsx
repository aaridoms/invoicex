import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export default function Genpdf({
  nFactura,
  fecha,
  cliente,
  cif,
  direccion,
  ciudad,
  concepto,
  precio,
}) {
  const styles = StyleSheet.create({
    page: {
      flexDirection: "row",
      backgroundColor: "#E4E4E4",
    },
    section: {
      margin: 10,
      padding: 10,
      flexGrow: 1,
    },
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text>{nFactura}</Text>
        </View>
        <View style={styles.section}>
          <Text>{fecha}</Text>
        </View>
      </Page>
    </Document>
  );
}
