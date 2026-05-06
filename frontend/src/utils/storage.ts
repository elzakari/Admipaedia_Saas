// Create a utility for secure storage
const storage = {
  setItem: (key: string, value: any) => {
    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
    } catch (error) {
      console.error('Error storing data:', error);
    }
  },
  
  getItem: <T>(key: string, defaultValue: T | null = null): T | null => {
    try {
      const serializedValue = localStorage.getItem(key);
      if (serializedValue === null) return defaultValue;
      return JSON.parse(serializedValue);
    } catch (error) {
      console.error('Error retrieving data:', error);
      return defaultValue;
    }
  },
  
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing data:', error);
    }
  }
};

export default storage;