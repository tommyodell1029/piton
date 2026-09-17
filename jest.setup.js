// AsyncStorage's native module doesn't exist under Jest's Node environment.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
