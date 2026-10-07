import json

log_path = "/home/manav/.gemini/antigravity/brain/60d13f45-3138-4432-8824-eedf32105e3c/.system_generated/logs/transcript_full.jsonl"

with open(log_path, 'r') as f:
    lines = f.readlines()

for line in lines:
    try:
        entry = json.loads(line)
        if entry.get("type") == "PLANNER_RESPONSE":
            for call in entry.get("tool_calls", []):
                name = call.get("name")
                args = call.get("args", {})
                
                # We only want to restore project files, not brain artifacts
                if "TargetFile" not in args or "brain" in args["TargetFile"]:
                    continue

                target_file = args["TargetFile"]
                
                if name == "write_to_file":
                    code = args.get("CodeContent", "")
                    with open(target_file, "w") as tf:
                        tf.write(code)
                    print(f"Wrote to {target_file}")
                
                elif name == "replace_file_content":
                    target_content = args.get("TargetContent", "")
                    replacement = args.get("ReplacementContent", "")
                    
                    with open(target_file, "r") as tf:
                        content = tf.read()
                    
                    if target_content in content:
                        content = content.replace(target_content, replacement, 1)
                        with open(target_file, "w") as tf:
                            tf.write(content)
                        print(f"Replaced in {target_file}")
                    else:
                        print(f"FAILED to find target content in {target_file}")
    except Exception as e:
        pass

