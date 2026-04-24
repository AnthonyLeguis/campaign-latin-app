export type AuthConfig = {
  user: string;
  password: string;
};

export const defaultAuthConfig: AuthConfig = {
  user: "admin01",
  password: "leo01",
};

export const ageOptions = ["Hasta 59 años", "60 – 79", "80+"];

export const stateMap: Record<string, string> = {
  Alabama: "Alabama",
  Alaska: "Alaska",
  Arizona: "Arizona",
  Arkansas: "Arkansas",
  California: "California",
  Colorado: "Colorado",
  Connecticut: "Connecticut",
  Delaware: "Delaware",
  Florida: "Florida",
  Georgia: "Georgia",
  Hawaii: "Hawái",
  Idaho: "Idaho",
  Illinois: "Illinois",
  Indiana: "Indiana",
  Iowa: "Iowa",
  Kansas: "Kansas",
  Kentucky: "Kentucky",
  Louisiana: "Luisiana",
  Maine: "Maine",
  Maryland: "Maryland",
  Massachusetts: "Massachusetts",
  Michigan: "Michigan",
  Minnesota: "Minnesota",
  Mississippi: "Misisipi",
  Missouri: "Misuri",
  Montana: "Montana",
  Nebraska: "Nebraska",
  Nevada: "Nevada",
  "New Hampshire": "New Hampshire",
  "New Jersey": "Nueva Jersey",
  "New Mexico": "Nuevo México",
  "New York": "Nueva York",
  "North Carolina": "Carolina del Norte",
  "North Dakota": "Dakota del Norte",
  Ohio: "Ohio",
  Oklahoma: "Oklahoma",
  Oregon: "Oregón",
  Pennsylvania: "Pensilvania",
  "Rhode Island": "Rhode Island",
  "South Carolina": "Carolina del Sur",
  "South Dakota": "Dakota del Sur",
  Tennessee: "Tennessee",
  Texas: "Texas",
  Utah: "Utah",
  Vermont: "Vermont",
  Virginia: "Virginia",
  Washington: "Washington",
  "West Virginia": "Virginia Occidental",
  Wisconsin: "Wisconsin",
  Wyoming: "Wyoming",
};
