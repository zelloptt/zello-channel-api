namespace ZelloMediaStream
{
    using System;
    using System.IO;

    class Program
    {
        static void Main(string[] args)
        {
            try {
            Directory.SetCurrentDirectory(
                Directory.GetParent(Directory.GetCurrentDirectory()).FullName);
            } catch {
                Console.WriteLine("Failed setting working directory");
                return;
            }

            ZelloMediaStream zelloMediaStream = null;
            try {
                zelloMediaStream = new ZelloMediaStream("stream.conf");

                if (!zelloMediaStream.Connect()) {
                    Console.WriteLine("Failed to connect");
                    return;
                }
                if (!zelloMediaStream.Authenticate()) {
                    Console.WriteLine("Failed to authenticate");
                    return;
                }
                if (!zelloMediaStream.StartStream()) {
                    Console.WriteLine("Failed to start streaming");
                    return;
                }
                if (!zelloMediaStream.SendAudio()) {
                    Console.WriteLine("Error during sending audio");
                }
                if (!zelloMediaStream.StopStream()) {
                    Console.WriteLine("Failed to send stop stream request");
                }
            } catch (Exception e){
                Console.WriteLine("Got an error: " + e.Message);
                return;
            } finally {
                if (zelloMediaStream != null) {
                    zelloMediaStream.Dispose();
                }
            }
        }
    }
}
