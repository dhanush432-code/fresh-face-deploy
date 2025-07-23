// services/reportService.ts

interface ReportParams {
  startDate: Date
  endDate: Date
  format: "pdf" | "excel"
}

// This is the correct, generalized function that accepts the API URL.
export const downloadReport = async (apiUrl: string, params: ReportParams): Promise<void> => {
  console.log("3. SERVICE is sending this to the backend:", { apiUrl, params }); // Keep for one final test

  try {
    // It uses the provided apiUrl to make the request
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      let errorMessage = "Failed to generate report due to a server error.";
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const errorData = await response.json();
        errorMessage = errorData.message || "An unknown error occurred.";
      } else {
        errorMessage = `Server returned a non-JSON error (Status: ${response.status}). Check server logs for details.`;
      }
      throw new Error(errorMessage);
    }

    // The rest of the download logic is the same
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = "report";
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch && filenameMatch.length > 1) {
        filename = filenameMatch[1];
      }
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

  } catch (error) {
    console.error("Download error:", error);
    throw error;
  }
}