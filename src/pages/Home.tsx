import { useEffect, useRef, useState } from "react";
import mqtt from "mqtt";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiBell,
  FiPlus,
  FiTrash2,
  FiClock,
  FiPower,
  FiWifi,
  FiWifiOff,
  FiAlertCircle,
  FiCheckCircle,
  FiVolume2,
  FiSettings,
  FiLoader,
  FiCalendar,
  FiWatch,
  FiPieChart,
  FiActivity,
  FiRefreshCw,
  FiPauseCircle,
  FiPlayCircle,
  FiSun,
  FiMoon,
  FiEdit2,
  FiChevronRight,
  FiUsers,
  FiAward,
  FiBook,
  FiUser,
  FiChevronDown,
  FiMenu,
  FiX,
  FiLogOut,
} from "react-icons/fi";
import { FaSchool } from "react-icons/fa6";

/* ================= MQTT CONFIG ================= */
const MQTT_URL = "wss://broker.hivemq.com:8884/mqtt";
const CONTROL_TOPIC = "gbhss/bell/control";
const STATUS_TOPIC = "gbhss/bell/status";

/* ================= TYPES ================= */
type Schedule = {
  hour: number;
  minute: number;
  count: number;
  duration: number;
};

/* ================= THEME MANAGER ================= */
const useTheme = () => {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bell-theme");
      if (saved === "light" || saved === "dark") return saved;
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("bell-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return { theme, toggleTheme };
};

/* ================= COMPONENT ================= */
export default function Home() {
  const clientRef = useRef<mqtt.MqttClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isRinging, setIsRinging] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [activeTab, setActiveTab] = useState<
    "schedules" | "manual" | "settings" | "about"
  >("schedules");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showTeamInfo, setShowTeamInfo] = useState(false);

  const { theme, toggleTheme } = useTheme();

  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(30);
  const [count, setCount] = useState(2);
  const [duration, setDuration] = useState(5);

  // Editing state
  const [editHour, setEditHour] = useState(9);
  const [editMinute, setEditMinute] = useState(30);
  const [editCount, setEditCount] = useState(2);
  const [editDuration, setEditDuration] = useState(5);

  /* ============ NOTIFICATION ============ */
  const showNotification = (
    message: string,
    type: "success" | "error" | "info",
  ) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  /* ============ MQTT CONNECT & EVENTS ============ */
  useEffect(() => {
    const client = mqtt.connect(MQTT_URL, {
      clientId: "web_" + Math.random().toString(16).slice(2),
      clean: true,
      reconnectPeriod: 3000,
      connectTimeout: 5000,
    });

    clientRef.current = client;

    client.on("connect", () => {
      console.log("MQTT connected");
      setConnected(true);
      setConnectionStatus("connected");
      showNotification("Connected to MQTT broker", "success");
      client.subscribe(STATUS_TOPIC);
      client.publish(CONTROL_TOPIC, "LIST");
    });

    const offline = () => {
      setConnected(false);
      setConnectionStatus("disconnected");
    };

    client.on("close", offline);
    client.on("offline", offline);
    client.on("reconnect", () => {
      setConnectionStatus("reconnecting");
      showNotification("Reconnecting to BELL...", "info");
    });
    client.on("error", (err) => {
      offline();
      showNotification(`Connection error: ${err.message}`, "error");
    });

    client.on("message", (topic, payload) => {
      const msg = payload.toString();
      console.log(`Received on ${topic}:`, msg);

      if (msg === "RINGING" || msg === "BELL_ON") {
        setIsRinging(true);
      } else if (msg === "STOPPED" || msg === "BELL_OFF") {
        setIsRinging(false);
      } else if (msg.startsWith("LIST:RESP:")) {
        const [, , index, h, m, c, d] = msg.split(":");
        setSchedules((prev) => {
          const copy = [...prev];
          copy[Number(index)] = {
            hour: +h,
            minute: +m,
            count: +c,
            duration: +d,
          };
          return copy.filter((item) => item !== undefined);
        });
      } else if (msg === "SCHEDULE_ADDED") {
        showNotification("Schedule added successfully", "success");
      } else if (msg === "SCHEDULE_DELETED") {
        showNotification("Schedule deleted", "success");
      } else if (msg === "SCHEDULE_UPDATED") {
        showNotification("Schedule updated", "success");
      }
    });

    return () => client.end(true);
  }, []);

  /* ================= MQTT SEND ================= */
  const publish = (msg: string) => {
    if (connected) {
      clientRef.current?.publish(CONTROL_TOPIC, msg);
      console.log("Published:", msg);
    } else {
      showNotification("Not connected to MQTT broker", "error");
    }
  };

  /* ================= SCHEDULE ACTIONS ================= */
  const addSchedule = () => {
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      showNotification(
        "Invalid time format. Hour: 0-23, Minute: 0-59",
        "error",
      );
      return;
    }
    if (count <= 0 || duration <= 0) {
      showNotification("Count and duration must be positive numbers", "error");
      return;
    }

    publish(`ADD:${hour}:${minute}:${count}:${duration}`);
    setTimeout(() => publish("LIST"), 500);

    // Reset form
    setHour(9);
    setMinute(30);
    setCount(2);
    setDuration(5);
  };

  const updateSchedule = (index: number) => {
    if (editHour < 0 || editHour > 23 || editMinute < 0 || editMinute > 59) {
      showNotification("Invalid time format", "error");
      return;
    }

    publish(
      `UPDATE:${index}:${editHour}:${editMinute}:${editCount}:${editDuration}`,
    );
    setTimeout(() => publish("LIST"), 500);
    setEditingIndex(null);
  };

  const deleteSchedule = (i: number) => {
    publish(`DEL:${i}`);
    setSchedules((prev) => prev.filter((_, idx) => idx !== i));
  };

  const startEditSchedule = (index: number, schedule: Schedule) => {
    setEditingIndex(index);
    setEditHour(schedule.hour);
    setEditMinute(schedule.minute);
    setEditCount(schedule.count);
    setEditDuration(schedule.duration);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
  };

  const refreshSchedules = () => {
    publish("LIST");
    showNotification("Refreshing schedules...", "info");
  };

  /* ================= MANUAL BELL CONTROL ================= */
  const pressTimer = useRef<any>(null);

  const bellDown = () => {
    // Send ON immediately on press
    publish("ON");
    setIsRinging(true);
  };

  const bellUp = () => {
    // Send OFF immediately on release
    publish("OFF");
    setIsRinging(false);
  };

  /* ================= UI COMPONENTS ================= */
  const ThemeToggle = () => (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.1 }}
      onClick={toggleTheme}
      className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors shadow-md"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <FiSun className="w-5 h-5" />
      ) : (
        <FiMoon className="w-5 h-5" />
      )}
    </motion.button>
  );

  const MobileMenu = () => (
    <AnimatePresence>
      {showMobileMenu && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="lg:hidden fixed inset-0 z-50"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowMobileMenu(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-900 shadow-2xl p-6">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Menu
              </h2>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-2">
              {[
                { id: "schedules", icon: <FiCalendar />, label: "Schedules" },
                { id: "manual", icon: <FiPower />, label: "Manual Control" },
                { id: "settings", icon: <FiSettings />, label: "Settings" },
                { id: "about", icon: <FiUsers />, label: "About Team" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setShowMobileMenu(false);
                  }}
                  className={`w-full flex items-center space-x-3 p-4 rounded-xl transition-all ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {tab.icon}
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
            <div className="absolute bottom-6 left-6 right-6">
              <button
                onClick={() => {
                  sessionStorage.removeItem("access");
                  window.location.href = "/verify";
                }}
                className="w-full flex items-center justify-center space-x-2 p-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium"
              >
                <FiLogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const ConnectionStatus = () => (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg dark:shadow-xl"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className={`p-2 rounded-full ${connected ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}
          >
            {connected ? (
              <FiWifi className="w-6 h-6 text-green-600 dark:text-green-400" />
            ) : (
              <FiWifiOff className="w-6 h-6 text-red-600 dark:text-red-400" />
            )}
          </div>
          <div>
            <h2 className="font-bold text-lg text-gray-900 dark:text-white">
              Smart Bell Controller
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Status:{" "}
              <span
                className={
                  connected
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }
              >
                {connected ? "Connected" : connectionStatus}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div
            className={`w-3 h-3 rounded-full animate-pulse ${connected ? "bg-green-500" : "bg-red-500"}`}
          />
          <FiBell
            className={`w-5 h-5 ${isRinging ? "text-yellow-500 dark:text-yellow-400 animate-bounce" : "text-gray-400"}`}
          />
          <ThemeToggle />
          <button
            onClick={() => setShowMobileMenu(true)}
            className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <FiMenu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      </div>
    </motion.div>
  );

  const TabNavigation = () => (
    <div className="hidden lg:flex space-x-2 mb-8 bg-gray-100 dark:bg-gray-900/50 p-1 rounded-xl">
      {[
        { id: "schedules", icon: <FiCalendar />, label: "Schedules" },
        { id: "manual", icon: <FiPower />, label: "Manual Control" },
        { id: "settings", icon: <FiSettings />, label: "Settings" },
        { id: "about", icon: <FiUsers />, label: "About Team" },
      ].map((tab) => (
        <motion.button
          key={tab.id}
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveTab(tab.id as any)}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-all ${
            activeTab === tab.id
              ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800"
          }`}
        >
          {tab.icon}
          <span className="font-medium">{tab.label}</span>
        </motion.button>
      ))}
    </div>
  );

  const AddScheduleForm = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 p-6 rounded-2xl mb-8 border border-gray-200 dark:border-gray-800 shadow-lg dark:shadow-xl"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <FiPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Add New Schedule
          </h3>
        </div>
        <FiWatch className="w-5 h-5 text-gray-400" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Hour",
            value: hour,
            setter: setHour,
            icon: <FiClock />,
            min: 0,
            max: 23,
          },
          {
            label: "Minute",
            value: minute,
            setter: setMinute,
            icon: <FiClock />,
            min: 0,
            max: 59,
          },
          {
            label: "Count",
            value: count,
            setter: setCount,
            icon: <FiVolume2 />,
            min: 1,
          },
          {
            label: "Duration (s)",
            value: duration,
            setter: setDuration,
            icon: <FiActivity />,
            min: 1,
          },
        ].map((field, idx) => (
          <div key={idx} className="space-y-2">
            <label className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
              {field.icon} <span className="ml-2">{field.label}</span>
            </label>
            <input
              type="number"
              min={field.min}
              max={field.max}
              value={field.value}
              onChange={(e) =>
                field.setter(parseInt(e.target.value) || field.min || 0)
              }
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-center text-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
            />
          </div>
        ))}
      </div>

      <motion.button
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.02 }}
        onClick={addSchedule}
        disabled={!connected}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-800 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center space-x-3 transition-all hover:shadow-lg hover:shadow-blue-500/25 dark:hover:shadow-blue-500/50"
      >
        <FiPlus className="w-5 h-5" />
        <span>Add Schedule</span>
        <FiCheckCircle className="w-5 h-5" />
      </motion.button>
    </motion.div>
  );

  const ScheduleList = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <FiCalendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Active Schedules
          </h3>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={refreshSchedules}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          title="Refresh schedules"
        >
          <FiRefreshCw
            className={`w-5 h-5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white ${!connected ? "animate-spin" : ""}`}
          />
        </motion.button>
      </div>

      <AnimatePresence>
        {schedules.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700"
          >
            <FiCalendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No schedules added yet
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Add your first schedule above
            </p>
          </motion.div>
        ) : (
          schedules.map((schedule, index) =>
            editingIndex === index ? (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-5 border-2 border-blue-200 dark:border-blue-800"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {[
                    {
                      label: "Hour",
                      value: editHour,
                      setter: setEditHour,
                      min: 0,
                      max: 23,
                    },
                    {
                      label: "Minute",
                      value: editMinute,
                      setter: setEditMinute,
                      min: 0,
                      max: 59,
                    },
                    {
                      label: "Count",
                      value: editCount,
                      setter: setEditCount,
                      min: 1,
                    },
                    {
                      label: "Duration (s)",
                      value: editDuration,
                      setter: setEditDuration,
                      min: 1,
                    },
                  ].map((field, idx) => (
                    <div key={idx} className="space-y-1">
                      <label className="text-xs text-gray-600 dark:text-gray-400">
                        {field.label}
                      </label>
                      <input
                        type="number"
                        min={field.min}
                        max={field.max}
                        value={field.value}
                        onChange={(e) =>
                          field.setter(
                            parseInt(e.target.value) || field.min || 0,
                          )
                        }
                        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg py-2 px-3 text-center text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end space-x-3">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={cancelEdit}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => updateSchedule(index)}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
                  >
                    Save Changes
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                whileHover={{ scale: 1.01 }}
                className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all group shadow-sm hover:shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                  <div className="flex items-start sm:items-center space-x-4 mb-4 sm:mb-0">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl flex items-center justify-center">
                        <FiClock className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-white">
                          {index + 1}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                          {String(schedule.hour).padStart(2, "0")}:
                          {String(schedule.minute).padStart(2, "0")}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                          {schedule.hour >= 12 ? "PM" : "AM"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center">
                          <FiVolume2 className="w-4 h-4 mr-1" />{" "}
                          {schedule.count}x
                        </span>
                        <span className="flex items-center">
                          <FiActivity className="w-4 h-4 mr-1" />{" "}
                          {schedule.duration}s
                        </span>
                        <span className="flex items-center">
                          <FiPieChart className="w-4 h-4 mr-1" /> Total:{" "}
                          {schedule.count * schedule.duration}s
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 self-end sm:self-center">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => startEditSchedule(index, schedule)}
                      disabled={!connected}
                      className="p-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all disabled:opacity-30"
                      title="Edit schedule"
                    >
                      <FiEdit2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => deleteSchedule(index)}
                      disabled={!connected}
                      className="p-3 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-800/50 rounded-xl transition-all disabled:opacity-30"
                      title="Delete schedule"
                    >
                      <FiTrash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ),
          )
        )}
      </AnimatePresence>
    </div>
  );

  const ManualControl = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="w-24 h-24 mx-auto mb-6 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur-xl opacity-30 dark:opacity-50" />
          <div className="relative w-24 h-24 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center border-4 border-gray-200 dark:border-gray-800 shadow-xl">
            <FiBell
              className={`w-12 h-12 ${isRinging ? "text-yellow-500 dark:text-yellow-400 animate-bounce" : "text-gray-400"}`}
            />
          </div>
        </div>
        <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
          Manual Bell Control
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Press and hold the button to ring the bell
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
          onClick={bellDown}
          disabled={!connected || isRinging}
          className="bg-gradient-to-r from-green-500 to-emerald-600 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-800 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center space-x-3 transition-all hover:shadow-lg hover:shadow-green-500/25"
        >
          <FiPlayCircle className="w-6 h-6" />
          <span>Start Bell</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
          onClick={bellUp}
          disabled={!connected || !isRinging}
          className="bg-gradient-to-r from-red-500 to-pink-600 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-800 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center space-x-3 transition-all hover:shadow-lg hover:shadow-red-500/25"
        >
          <FiPauseCircle className="w-6 h-6" />
          <span>Stop Bell</span>
        </motion.button>
      </div>

      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg dark:shadow-xl">
        <div className="text-center mb-6">
          <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-2">
            Press & Hold Bell
          </h4>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Press to turn ON • Release to turn OFF • Bell rings while pressed
          </p>
        </div>

        <motion.button
          onMouseDown={bellDown}
          onMouseUp={bellUp}
          onTouchStart={bellDown}
          onTouchEnd={bellUp}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
          disabled={!connected}
          className={`w-full py-8 rounded-2xl font-bold text-xl transition-all relative overflow-hidden ${
            isRinging
              ? "bg-gradient-to-r from-yellow-400 to-orange-500 shadow-lg shadow-orange-500/50"
              : "bg-gradient-to-r from-blue-500 to-purple-600 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-800"
          }`}
        >
          <div className="relative z-10 flex items-center justify-center space-x-3">
            <FiBell
              className={`w-7 h-7 ${isRinging ? "animate-bounce" : ""}`}
            />
            <span>{isRinging ? "Ringing..." : "Press to Ring Bell"}</span>
          </div>
        </motion.button>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isRinging
              ? "Bell is ringing - release button to stop"
              : "Press and hold the button to start ringing"}
          </p>
        </div>
      </div>
    </motion.div>
  );

  const SettingsPanel = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg dark:shadow-xl">
        <h3 className="text-xl font-bold mb-6 flex items-center space-x-3 text-gray-900 dark:text-white">
          <FiSettings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <span>System Settings</span>
        </h3>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <div className="flex items-center space-x-3 mb-2 sm:mb-0">
              <FiWifi className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  MQTT Connection
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  broker.hivemq.com:8884
                </p>
              </div>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium w-fit ${
                connected
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
              }`}
            >
              {connected ? "Connected" : "Disconnected"}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <div className="flex items-center space-x-3 mb-2 sm:mb-0">
              <FiBell className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Bell Status
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Current ring state
                </p>
              </div>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium w-fit ${
                isRinging
                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {isRinging ? "Ringing" : "Idle"}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <div className="flex items-center space-x-3 mb-2 sm:mb-0">
              <FiPieChart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Total Schedules
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Active timers configured
                </p>
              </div>
            </div>
            <div className="px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 rounded-full font-bold w-fit">
              {schedules.length}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <div className="flex items-center space-x-3 mb-2 sm:mb-0">
              {theme === "dark" ? (
                <FiMoon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <FiSun className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              )}
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Theme
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Interface appearance
                </p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-full text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 w-fit"
            >
              {theme === "dark" ? "Dark" : "Light"}
            </motion.button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg dark:shadow-xl">
        <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">
          System Information
        </h3>
        <div className="space-y-3 text-gray-600 dark:text-gray-400">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
            <span>Client ID:</span>
            <span className="text-gray-900 dark:text-white font-mono text-sm sm:text-base">
              web_{Math.random().toString(16).slice(2, 8)}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
            <span>Control Topic:</span>
            <span className="text-gray-900 dark:text-white font-mono text-sm sm:text-base">
              {CONTROL_TOPIC}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
            <span>Status Topic:</span>
            <span className="text-gray-900 dark:text-white font-mono text-sm sm:text-base">
              {STATUS_TOPIC}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2">
            <span>Last Updated:</span>
            <span className="text-gray-900 dark:text-white text-sm sm:text-base">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const AboutTeam = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* School Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-2xl text-white shadow-lg">
        <div className="flex flex-col sm:flex-row items-center justify-between">
          <div className="text-center sm:text-left mb-4 sm:mb-0">
            <div className="flex items-center justify-center sm:justify-start space-x-3 mb-2">
              <FaSchool className="w-8 h-8" />
              <h2 className="text-2xl font-bold">
                GOVERNMENT BOYS HIGHER SECONDARY SCHOOL
              </h2>
            </div>
            <p className="text-blue-100">Chinna Salem, Tamil Nadu</p>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <FiBell className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Project Info */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg">
        <div className="flex items-center space-x-3 mb-6">
          <FiAward className="w-6 h-6 text-yellow-500" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Project Details
          </h3>
        </div>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <p className="text-gray-700 dark:text-gray-300 text-center">
              <span className="font-bold">SMART SCHOOL BELL SYSTEM</span> - An
              IoT based automated bell ringing system using MQTT protocol for
              efficient school period management.
            </p>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <FiUsers className="w-6 h-6 text-purple-500" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Project Team
            </h3>
          </div>
          <button
            onClick={() => setShowTeamInfo(!showTeamInfo)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <FiChevronDown
              className={`w-5 h-5 transition-transform ${showTeamInfo ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        <AnimatePresence>
          {showTeamInfo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: "R. Suriyaprakash" },
                  { name: "M. Haricibha" },
                  { name: "G. Pradhap" },
                  { name: "M. Rithick" },
                ].map((member, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <FiUser className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white">
                          {member.name}
                        </h4>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Guides & Support */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg">
        <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white flex items-center space-x-3">
          <FiBook className="w-6 h-6 text-green-500" />
          <span>Guides & Support</span>
        </h3>
        <div className="space-y-4">
          {[
            {
              name: "Mr. V. Gopinath",
              role: "Physics Teacher & Project Guide",
              desc: "Provided technical guidance and mentorship",
            },
            {
              name: "Mr. P. Velmurugan",
              role: "Headmaster",
              desc: "Supported project implementation in school",
            },
          ].map((guide, index) => (
            <div
              key={index}
              className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800"
            >
              <h4 className="font-bold text-gray-900 dark:text-white text-lg">
                {guide.name}
              </h4>
              <p className="text-green-600 dark:text-green-400 mb-1">
                {guide.role}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {guide.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Technology Stack */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Technology Stack
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            "React",
            "TypeScript",
            "MQTT",
            "IoT",
            "ESP8266",
            "Node.js",
            "Tailwind CSS",
            "Framer Motion",
          ].map((tech, index) => (
            <div
              key={index}
              className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-center"
            >
              <span className="font-medium text-gray-900 dark:text-white">
                {tech}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-black text-gray-900 dark:text-white p-4 md:p-6 max-w-6xl mx-auto">
      {/* NOTIFICATION */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-4 rounded-xl shadow-lg backdrop-blur-sm border max-w-sm sm:max-w-md w-[90vw] ${
              notification.type === "success"
                ? "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300"
                : notification.type === "error"
                  ? "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-300"
                  : "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300"
            }`}
          >
            <div className="flex items-center space-x-3">
              {notification.type === "success" ? (
                <FiCheckCircle className="w-5 h-5 flex-shrink-0" />
              ) : notification.type === "error" ? (
                <FiAlertCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <FiLoader className="w-5 h-5 animate-spin flex-shrink-0" />
              )}
              <span className="font-medium text-sm sm:text-base">
                {notification.message}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MobileMenu />

      {/* MAIN CONTENT */}
      <ConnectionStatus />
      <TabNavigation />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "schedules" && (
            <>
              <AddScheduleForm />
              <ScheduleList />
            </>
          )}
          {activeTab === "manual" && <ManualControl />}
          {activeTab === "settings" && <SettingsPanel />}
          {activeTab === "about" && <AboutTeam />}
        </motion.div>
      </AnimatePresence>

      {/* FOOTER */}
      <footer className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-800 text-center text-gray-600 dark:text-gray-400 text-sm">
        <p className="text-gray-900 dark:text-white font-medium mb-1">
          Smart School Bell Controller
        </p>
        <p className="mb-3">MQTT Web Interface • GBHSS Chinnasalem</p>
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <FiActivity className="w-4 h-4" />
            <span>Real-time control system</span>
          </div>
          <div className="hidden sm:block">•</div>
          <div className="flex items-center space-x-1">
            <FiChevronRight className="w-4 h-4" />
            <span>Press & Hold for manual ringing</span>
          </div>
        </div>
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-600">
          Developed with ❤️ by Team GBHSS | {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
