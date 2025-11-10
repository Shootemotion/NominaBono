export default {
  testEnvironment: "node",
  transform: {
    "^.+\\.js$": "babel-jest", // usar babel para .js
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1", // corrige imports relativos con extensión
  },
};
